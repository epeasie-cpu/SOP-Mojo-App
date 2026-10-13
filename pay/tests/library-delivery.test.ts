import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProduct } from "@/lib/catalog";
import { fileCatalogStore, memoryCatalogStore, supabaseCatalogStore } from "@/lib/catalog-store";
import { memoryEventStore } from "@/lib/event-store";
import { deliveryEmailContent, deliverySendKey, sendDeliveryEmail } from "@/lib/fulfillment";
import {
  NOT_AVAILABLE_YET,
  PROTECTED_CATALOG_IDS,
  checkoutErrorStatus,
  isDeliveryUnavailable,
  libraryProducts,
  unavailableGoHtml,
} from "@/lib/library";
import { openCheckoutSession } from "@/lib/open-checkout";
import { processStripeEvent } from "@/lib/process-event";
import { seedCatalog, seedProducts } from "@/lib/seed";
import { deliveryLink } from "@/lib/success";
import type { IncomingStripeEvent } from "@/lib/stripe-events";

function readyLibraryProduct() {
  const product = libraryProducts()[0]!;
  return {
    ...product,
    delivery: { kind: "email_link" as const, url: "https://files.example/aup", label: "Open the policy tool" },
  };
}

function paidLibrary(id: string): IncomingStripeEvent {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        payment_status: "paid",
        customer_details: { email: "Buyer@Example.com" },
        metadata: { product_id: "aup_generator", entitlements: "", email: "buyer@example.com" },
      },
    },
  };
}

describe("SOP Library delivery", () => {
  it("seeds four one-time slide-out products with empty links and no app entitlement", () => {
    const products = libraryProducts();
    expect(products.map((product) => product.id)).toEqual([
      "aup_generator",
      "business_os_dashboard",
      "business_os_blueprint",
      "offers_guide",
    ]);
    expect(products.map((product) => product.priceCents)).toEqual([9799, 499, 2700, 1998]);
    for (const product of products) {
      expect(product.billing).toBe("once");
      expect(product.presentation).toBe("panel");
      expect(product.entitlementProduct).toBeNull();
      expect(product.delivery?.kind).toBe("email_link");
      expect(product.delivery?.url).toBe("");
      expect(isDeliveryUnavailable(product)).toBe(true);
      expect(PROTECTED_CATALOG_IDS).not.toContain(product.id);
    }
    expect(products[0]?.delivery?.label).toBe("Open the policy tool");
    expect(products[1]?.delivery?.label).toBe("Download");
    const [flowchart, builder] = seedProducts();
    expect(flowchart?.priceCents).toBe(1900);
    expect(builder?.priceCents).toBe(3900);
    expect(builder?.annual?.priceCents).toBe(39000);
  });

  it("rejects an email link that also grants an app entitlement", () => {
    expect(() =>
      parseProduct({
        ...libraryProducts()[0],
        entitlementProduct: "builder_pro",
      }),
    ).toThrow(/does not grant an app entitlement/);
    const stored = { ...seedProducts()[0]! };
    delete (stored as { delivery?: unknown }).delivery;
    expect(parseProduct(stored).delivery).toBeNull();
  });

  it("inserts only missing library rows and leaves builder, flowchart, and settings alone", async () => {
    const store = memoryCatalogStore(seedCatalog());
    const first = await store.insertIfAbsent(libraryProducts());
    expect(first.inserted).toEqual([
      "aup_generator",
      "business_os_dashboard",
      "business_os_blueprint",
      "offers_guide",
    ]);
    const snapshot = await store.read();
    const aup = snapshot.products.find((product) => product.id === "aup_generator")!;
    await store.write({
      ...snapshot,
      products: snapshot.products.map((product) =>
        product.id === "aup_generator"
          ? { ...product, delivery: { kind: "email_link", url: "https://files.example/aup", label: "Open the policy tool" } }
          : product,
      ),
    });
    const second = await store.insertIfAbsent(libraryProducts());
    expect(second.inserted).toEqual([]);
    expect(second.skipped).toEqual(first.inserted);
    const after = await store.read();
    expect(after.products.find((product) => product.id === "builder_pro")).toMatchObject({
      priceCents: 3900,
      entitlementProduct: "builder_pro",
    });
    expect(after.products.find((product) => product.id === "flowchart_plus")?.priceCents).toBe(1900);
    expect(after.settings).toEqual({ stripeMode: "test", taxNotice: null });
    expect(after.products.find((product) => product.id === "aup_generator")?.delivery?.url).toBe("https://files.example/aup");
    expect(aup.delivery?.url).toBe("");
    await expect(
      store.insertIfAbsent([{ ...libraryProducts()[0]!, id: "builder_pro" }]),
    ).rejects.toThrow(/cannot write/);
  });

  it("posts only the missing library ids to pay_catalog", async () => {
    const calls: { method: string; url: string; body: unknown }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ method, url, body });
      if (method === "GET") return Response.json([{ id: "offers_guide" }]);
      if (method === "DELETE") throw new Error("library seed must not delete catalog rows");
      return Response.json([]);
    };
    const store = supabaseCatalogStore({
      url: "https://example.supabase.co",
      serviceRoleKey: "service",
      fetchImpl,
    });
    const result = await store.insertIfAbsent(libraryProducts());
    expect(result.skipped).toEqual(["offers_guide"]);
    expect(result.inserted).toEqual(["aup_generator", "business_os_dashboard", "business_os_blueprint"]);
    const post = calls.find((call) => call.method === "POST");
    const rows = post?.body as { id: string }[];
    expect(rows.map((row) => row.id)).toEqual(["aup_generator", "business_os_dashboard", "business_os_blueprint"]);
    expect(JSON.stringify(post?.body)).not.toContain("builder_pro");
    expect(JSON.stringify(post?.body)).not.toContain("flowchart_plus");
    expect(JSON.stringify(post?.body)).not.toContain("__settings");
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    const dir = await mkdtemp(path.join(tmpdir(), "pay-library-"));
    const file = path.join(dir, "catalog.json");
    const fileStore = fileCatalogStore(file);
    await fileStore.write(seedCatalog());
    await fileStore.insertIfAbsent(libraryProducts());
    const raw = JSON.parse(await readFile(file, "utf8")) as {
      settings: { stripeMode: string };
      products: { id: string; priceCents: number }[];
    };
    expect(raw.settings.stripeMode).toBe("test");
    expect(raw.products.find((product) => product.id === "builder_pro")?.priceCents).toBe(3900);
    expect(raw.products.find((product) => product.id === "aup_generator")?.priceCents).toBe(9799);
  });

  it("refuses checkout and /go when the delivery link is empty", async () => {
    const product = libraryProducts()[3]!;
    await expect(
      openCheckoutSession({
        product,
        annual: false,
        bump: false,
        returnOrigin: "https://pay.sopmojo.com",
        snapshot: seedCatalog(),
        store: memoryCatalogStore(),
        env: {} as NodeJS.ProcessEnv,
      }),
    ).rejects.toThrow(NOT_AVAILABLE_YET);
    expect(checkoutErrorStatus(NOT_AVAILABLE_YET)).toBe(409);
    expect(unavailableGoHtml(product.title)).toContain(NOT_AVAILABLE_YET);
    const checkout = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/page.tsx"), "utf8");
    const go = readFileSync(path.join(process.cwd(), "app/go/[slug]/route.ts"), "utf8");
    expect(checkout).toContain("NOT_AVAILABLE_YET");
    expect(checkout).toContain("isDeliveryUnavailable");
    expect(go).toContain("unavailableGoHtml");
  });

  it("emails the link once per email and event, with no entitlement grant", async () => {
    const product = readyLibraryProduct();
    const catalog = memoryCatalogStore({
      products: [product],
      settings: { stripeMode: "test", taxNotice: null },
    });
    const store = memoryEventStore();
    const resend: { subject?: string; text?: string; html?: string; to?: string[] }[] = [];
    const tags: unknown[] = [];
    let entitlementPosts = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      if (url.includes("/api/webhooks/entitlements") || url.includes("entitlements")) {
        entitlementPosts += 1;
        return Response.json({ ok: true });
      }
      if (url.includes("api.resend.com")) {
        resend.push(body as { subject?: string; text?: string; html?: string; to?: string[] });
        return Response.json({ id: "email_1" });
      }
      if (url.includes("api.mailchimp.com") && url.endsWith("/tags")) tags.push(body);
      return Response.json({});
    };
    const env = {
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "SOP Mojo <orders@sopmojo.com>",
      MAILCHIMP_API_KEY: "key-us21",
      MAILCHIMP_AUDIENCE_ID: "aud",
    } as unknown as NodeJS.ProcessEnv;
    const deps = { env, fetchImpl, store, catalog };
    const first = await processStripeEvent(paidLibrary("evt_library"), deps);
    const second = await processStripeEvent(paidLibrary("evt_library"), deps);
    const again = await processStripeEvent(paidLibrary("evt_library_again"), deps);
    expect(first).toEqual({ duplicate: false, action: "ignore" });
    expect(second).toEqual({ duplicate: true, action: "ignore" });
    expect(again.duplicate).toBe(false);
    expect(entitlementPosts).toBe(0);
    expect(resend).toHaveLength(2);
    expect(resend[0]?.to).toEqual(["buyer@example.com"]);
    expect(resend[0]?.subject).toBe("Acceptable Use Policy Generator is ready");
    expect(resend[0]?.text).toContain("https://files.example/aup");
    expect(resend[0]?.text).toContain("Check your junk and spam folder too.");
    expect(resend[0]?.html).toContain('href="https://files.example/aup"');
    expect(resend[0]?.html).toContain("Open the policy tool");
    expect(tags).toEqual([
      {
        tags: [
          { name: "checkout", status: "active" },
          { name: "aup-generator", status: "active" },
        ],
      },
      {
        tags: [
          { name: "checkout", status: "active" },
          { name: "aup-generator", status: "active" },
        ],
      },
    ]);
    expect(deliverySendKey("Buyer@Example.com", "evt_library")).toBe("buyer@example.com|evt_library|delivery");
    const content = deliveryEmailContent({
      title: product.title,
      url: "https://files.example/aup",
      label: product.delivery!.label,
    });
    expect(content.html).toContain("Check your junk and spam folder too.");
    const skipped = await sendDeliveryEmail({
      email: "buyer@example.com",
      eventId: "evt_library",
      product,
      env,
      fetchImpl,
      store,
    });
    expect(skipped).toBe("skipped");
    expect(resend).toHaveLength(2);
  });

  it("shows the emailed link on the thank-you page only after the session is complete", () => {
    const empty = libraryProducts()[1]!;
    expect(deliveryLink(empty)).toBeNull();
    const ready = readyLibraryProduct();
    expect(deliveryLink(ready)).toEqual({ url: "https://files.example/aup", label: "Open the policy tool" });
    const page = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/complete/page.tsx"), "utf8");
    const admin = readFileSync(path.join(process.cwd(), "components/AdminDashboard.tsx"), "utf8");
    expect(page).toContain("const link = paid ? deliveryLink(product) : null");
    expect(page).toContain("We emailed your {title} link.");
    expect(page).toContain("href={link.url}");
    expect(page).toContain("Check your email for your username and password.");
    expect(admin).toContain("Delivery link");
    expect(admin).toContain("Email a link");
    expect(admin).toContain("Add SOP Library products");
    expect(admin).toContain("/api/admin/catalog/library");
  });
});
