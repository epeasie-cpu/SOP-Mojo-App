import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { parseProduct } from "@/lib/catalog";
import { fileCatalogStore, memoryCatalogStore, supabaseCatalogStore } from "@/lib/catalog-store";
import { memoryEventStore } from "@/lib/event-store";
import { deliveryEmailContent, deliverySendKey, sendDeliveryEmail } from "@/lib/fulfillment";
import { PATCH, POST } from "@/app/api/checkout/session/route";
import { GET as goToCheckout } from "@/app/go/[slug]/route";
import { BLUEPRINT_PATH } from "@/lib/blueprint-page";
import {
  BLUEPRINT_FILENAME,
  BLUEPRINT_STORAGE_PATH,
  DASHBOARD_CHECKOUT_ERROR,
  DASHBOARD_PRODUCT_ID,
  NOT_AVAILABLE_YET,
  PROTECTED_CATALOG_IDS,
  checkoutErrorStatus,
  ACCESS_LINK_ON_THE_WAY,
  AUP_MAKE_ENV,
  AUP_SAMCART_SLUG,
  isDashboardSlug,
  isDeliveryUnavailable,
  libraryProducts,
  retireDashboard,
  syncAupDelivery,
  unavailableGoHtml,
} from "@/lib/library";
import { makeOrderPayload, makeSendKey, urlFromWebhookJson, webhookBodyShape } from "@/lib/make-delivery";
import { openCheckoutSession } from "@/lib/open-checkout";
import { processStripeEvent } from "@/lib/process-event";
import { seedCatalog, seedProducts } from "@/lib/seed";
import { deliveryLink, paidDeliveryView } from "@/lib/success";
import type { IncomingStripeEvent } from "@/lib/stripe-events";

function emptyEmailProduct() {
  return parseProduct({
    id: "empty_link",
    title: "Empty link",
    description: "A download that is not ready.",
    priceCents: 500,
    currency: "usd",
    imageUrl: "",
    billing: "once",
    annual: null,
    orderBump: null,
    presentation: "panel",
    entitlementProduct: null,
    leadMagnet: false,
    delivery: { kind: "email_link", url: "", label: "Download" },
    active: true,
  });
}

function readyLibraryProduct() {
  const product = libraryProducts().find((item) => item.id === "offers_guide")!;
  return {
    ...product,
    delivery: { kind: "email_link" as const, url: "https://files.example/offers", label: "Download" },
  };
}

function paidLibrary(id: string, productId = "offers_guide"): IncomingStripeEvent {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${id}`,
        payment_status: "paid",
        amount_total: 1998,
        created: 1_700_000_000,
        customer_details: { email: "Buyer@Example.com", name: "Ryan Pease", phone: "555" },
        metadata: { product_id: productId, entitlements: "", email: "buyer@example.com" },
      },
    },
  };
}

describe("SOP Library delivery", () => {
  it("seeds the library products with empty links and no app entitlement", () => {
    const products = libraryProducts();
    expect(products.map((product) => product.id)).toEqual([
      "aup_generator",
      "business_os_blueprint",
      "offers_guide",
      "founder_trap_guide",
    ]);
    expect(products.map((product) => product.id)).not.toContain(DASHBOARD_PRODUCT_ID);
    expect(products.map((product) => product.priceCents)).toEqual([9799, 2700, 1999, 0]);
    for (const product of products) {
      expect(product.billing).toBe("once");
      expect(product.presentation).toBe("panel");
      expect(product.entitlementProduct).toBeNull();
      expect(PROTECTED_CATALOG_IDS).not.toContain(product.id);
    }
    expect(products[0]?.delivery).toEqual({
      kind: "make_webhook",
      envVar: "AUP_MAKE_WEBHOOK_URL",
      label: "Open the policy tool",
    });
    expect(isDeliveryUnavailable(products[0]!)).toBe(false);
    expect(products[1]?.delivery).toEqual({
      kind: "secure_file",
      storagePath: BLUEPRINT_STORAGE_PATH,
      filename: BLUEPRINT_FILENAME,
    });
    expect(products[1]?.priceCents).toBe(2700);
    expect(products[1]?.orderBump).toBeNull();
    expect(isDeliveryUnavailable(products[1]!)).toBe(false);
    expect(products[2]?.delivery).toEqual({
      kind: "secure_file",
      storagePath: "deliverables/high-converting-offers-guide.pdf",
      filename: "High-Converting-Offers-Guide.pdf",
    });
    expect(products[2]?.priceCents).toBe(1999);
    expect(products[2]?.orderBump).toBeNull();
    expect(isDeliveryUnavailable(products[2]!)).toBe(false);
    expect(products[3]?.leadMagnet).toBe(true);
    expect(products[3]?.priceCents).toBe(0);
    expect(products[3]?.delivery).toEqual({
      kind: "secure_file",
      storagePath: "deliverables/escape-the-founder-trap.pdf",
      filename: "Escape-the-Founder-Trap.pdf",
    });
    expect(readFileSync(path.join(process.cwd(), "lib/library.ts"), "utf8")).not.toContain("BLUEPRINT_BUMP_READY");
    expect(products[0]?.delivery?.kind === "make_webhook" ? products[0].delivery.label : "").toBe("Open the policy tool");
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
      "business_os_blueprint",
      "offers_guide",
      "founder_trap_guide",
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
    expect(after.products.find((product) => product.id === "aup_generator")?.delivery).toMatchObject({
      kind: "email_link",
      url: "https://files.example/aup",
    });
    expect(aup.delivery).toEqual({
      kind: "make_webhook",
      envVar: "AUP_MAKE_WEBHOOK_URL",
      label: "Open the policy tool",
    });
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
    expect(result.inserted).toEqual([
      "aup_generator",
      "business_os_blueprint",
      "founder_trap_guide",
    ]);
    const post = calls.find((call) => call.method === "POST");
    const rows = post?.body as { id: string }[];
    expect(rows.map((row) => row.id)).toEqual([
      "aup_generator",
      "business_os_blueprint",
      "founder_trap_guide",
    ]);
    expect(JSON.stringify(post?.body)).not.toContain(DASHBOARD_PRODUCT_ID);
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
    const product = emptyEmailProduct();
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
    expect(checkout).toContain("deliveryIsBlocked");
    expect(go).toContain("deliveryIsBlocked");
    expect(go).toContain("unavailableGoHtml");
  });

  it("retires a leftover dashboard row and redirects its checkout paths to the blueprint", async () => {
    const store = memoryCatalogStore(seedCatalog());
    expect(await retireDashboard(store)).toEqual([]);
    expect((await store.read()).products.some((product) => product.id === DASHBOARD_PRODUCT_ID)).toBe(false);

    const retired = parseProduct({
      ...emptyEmailProduct(),
      id: DASHBOARD_PRODUCT_ID,
      title: "Business OS Dashboard",
      description: "Downloadable Business OS dashboard.",
      priceCents: 499,
      delivery: { kind: "email_link", url: "https://files.example/dashboard", label: "Download" },
      active: true,
    });
    const snapshot = await store.read();
    await store.write({ ...snapshot, products: [...snapshot.products, retired] });
    expect(await retireDashboard(store)).toEqual([DASHBOARD_PRODUCT_ID]);
    expect(await retireDashboard(store)).toEqual([]);
    await store.insertIfAbsent(libraryProducts());
    const after = await store.read();
    expect(after.products.find((product) => product.id === DASHBOARD_PRODUCT_ID)).toMatchObject({ active: false });
    expect(after.products.filter((product) => product.id === DASHBOARD_PRODUCT_ID)).toHaveLength(1);
    expect(after.products.find((product) => product.id === "builder_pro")?.priceCents).toBe(3900);

    expect(isDashboardSlug("business-os-dashboard")).toBe(true);
    expect(isDashboardSlug("business_os_blueprint")).toBe(false);
    const underscore = await goToCheckout(new Request("https://pay.sopmojo.com/go/business_os_dashboard"), {
      params: Promise.resolve({ slug: "business_os_dashboard" }),
    });
    expect(underscore.status).toBe(302);
    expect(underscore.headers.get("location")).toBe(`https://pay.sopmojo.com${BLUEPRINT_PATH}`);
    const hyphen = await goToCheckout(new Request("https://pay.sopmojo.com/go/business-os-dashboard"), {
      params: Promise.resolve({ slug: "business-os-dashboard" }),
    });
    expect(hyphen.status).toBe(302);
    expect(hyphen.headers.get("location")).toBe(`https://pay.sopmojo.com${BLUEPRINT_PATH}`);

    const checkout = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/page.tsx"), "utf8");
    const pageFn = checkout.slice(checkout.indexOf("export default async function CheckoutPage"));
    expect(pageFn.indexOf("isDashboardSlug")).toBeLessThan(pageFn.indexOf("findProduct"));
    expect(pageFn).toContain("redirect(BLUEPRINT_PATH)");
    const meta = checkout.slice(checkout.indexOf("export async function generateMetadata"), checkout.indexOf("function NotAvailable"));
    expect(meta.indexOf("isDashboardSlug")).toBeLessThan(meta.indexOf("findProduct"));

    const productPage = readFileSync(path.join(process.cwd(), "app/p/[slug]/page.tsx"), "utf8");
    const productFn = productPage.slice(productPage.indexOf("export default async function ProductPage"));
    expect(productFn.indexOf("isDashboardSlug")).toBeLessThan(productFn.indexOf("findProduct"));
    expect(productFn).toContain("redirect(BLUEPRINT_PATH)");
    expect(readFileSync(path.join(process.cwd(), "app/sitemap.xml/route.ts"), "utf8")).toContain("isDashboardSlug");
    expect(readFileSync(path.join(process.cwd(), "app/api/admin/catalog/library/route.ts"), "utf8")).toContain("retireDashboard");
    expect(readFileSync(path.join(process.cwd(), "lib/mailchimp.ts"), "utf8")).not.toContain("business-os-dashboard");

    const session = await POST(
      new Request("https://pay.sopmojo.com/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({ slug: "business_os_dashboard", email: "buyer@example.com" }),
      }),
    );
    expect(session.status).toBe(409);
    expect(await session.json()).toEqual({ error: DASHBOARD_CHECKOUT_ERROR });
    const patched = await PATCH(
      new Request("https://pay.sopmojo.com/api/checkout/session", {
        method: "PATCH",
        body: JSON.stringify({ sessionId: "cs_test", slug: "business-os-dashboard", email: "buyer@example.com" }),
      }),
    );
    expect(patched.status).toBe(409);
    expect(checkoutErrorStatus(DASHBOARD_CHECKOUT_ERROR)).toBe(409);
    await expect(
      openCheckoutSession({
        product: retired,
        annual: false,
        bump: false,
        returnOrigin: "https://pay.sopmojo.com",
        snapshot: seedCatalog(),
        store: memoryCatalogStore(),
        env: {
          STRIPE_SECRET_KEY: "sk_test_unused",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unused",
        } as unknown as NodeJS.ProcessEnv,
      }),
    ).rejects.toThrow(DASHBOARD_CHECKOUT_ERROR);

    const sales = [
      "components/BlueprintLanding.tsx",
      "components/OffersLanding.tsx",
      "components/FounderTrapLanding.tsx",
      "lib/blueprint-page.ts",
      "lib/offers-page.ts",
      "lib/founder-trap-page.ts",
      "components/YouMayAlsoLike.tsx",
      "app/robots.txt/route.ts",
    ];
    for (const file of sales) {
      const text = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(text, file).not.toMatch(/business_os_dashboard|business-os-dashboard|Business OS Dashboard|Diagnostic Dashboard/);
    }
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
    expect(resend[0]?.subject).toBe("The Ultimate Guide to Creating High-Converting Offers That Sell is ready");
    expect(resend[0]?.text).toContain("https://files.example/offers");
    expect(resend[0]?.text).toContain("Check your junk and spam folder too.");
    expect(resend[0]?.html).toContain('href="https://files.example/offers"');
    expect(resend[0]?.html).toContain("Download");
    expect(tags).toEqual([
      {
        tags: [
          { name: "checkout", status: "active" },
          { name: "offers-guide", status: "active" },
        ],
      },
      {
        tags: [
          { name: "checkout", status: "active" },
          { name: "offers-guide", status: "active" },
        ],
      },
    ]);
    expect(deliverySendKey("Buyer@Example.com", "evt_library")).toBe("buyer@example.com|evt_library|delivery");
    const content = deliveryEmailContent({
      title: product.title,
      url: "https://files.example/offers",
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
    const empty = emptyEmailProduct();
    expect(deliveryLink(empty)).toBeNull();
    const ready = readyLibraryProduct();
    expect(deliveryLink(ready)).toEqual({ url: "https://files.example/offers", label: "Download" });
    const page = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/complete/page.tsx"), "utf8");
    const admin = readFileSync(path.join(process.cwd(), "components/AdminDashboard.tsx"), "utf8");
    expect(page).toContain("paidDeliveryView(product, accessUrl)");
    expect(page).toContain("We emailed your {title} link.");
    expect(page).toContain("href={delivery.url}");
    expect(page).toContain("Check your email for your username and password.");
    expect(admin).toContain("Delivery link");
    expect(admin).toContain("Email a link");
    expect(admin).toContain("Make webhook");
    expect(admin).toContain("Add SOP Library products");
    expect(admin).toContain("/api/admin/catalog/library");
    const aup = libraryProducts()[0]!;
    expect(paidDeliveryView(aup, null)).toEqual({ kind: "pending", message: ACCESS_LINK_ON_THE_WAY });
    expect(paidDeliveryView(aup, "https://docs.example/token")).toEqual({
      kind: "link",
      url: "https://docs.example/token",
      label: "Open the policy tool",
    });
    expect(page).toContain("{delivery.message}");
  });

  it("switches an existing aup row to the Make webhook and leaves every other product alone", async () => {
    const store = memoryCatalogStore(seedCatalog());
    await store.insertIfAbsent(libraryProducts());
    const snapshot = await store.read();
    await store.write({
      ...snapshot,
      products: snapshot.products.map((product) =>
        product.id === "aup_generator"
          ? { ...product, delivery: { kind: "email_link", url: "https://files.example/old", label: "Open the policy tool" } }
          : product,
      ),
    });
    expect(await syncAupDelivery(store)).toEqual(["aup_generator"]);
    expect(await syncAupDelivery(store)).toEqual([]);
    const after = await store.read();
    expect(after.products.find((product) => product.id === "aup_generator")).toMatchObject({
      priceCents: 9799,
      delivery: { kind: "make_webhook", envVar: AUP_MAKE_ENV, label: "Open the policy tool" },
    });
    expect(after.products.find((product) => product.id === "builder_pro")?.priceCents).toBe(3900);
    expect(after.products.find((product) => product.id === "offers_guide")).toMatchObject({
      priceCents: 1999,
      delivery: { kind: "secure_file", storagePath: "deliverables/high-converting-offers-guide.pdf" },
    });
    const calls: { method: string; body: unknown }[] = [];
    const remote = supabaseCatalogStore({
      url: "https://example.supabase.co",
      serviceRoleKey: "service",
      fetchImpl: async (input, init) => {
        const method = init?.method ?? "GET";
        calls.push({ method, body: init?.body ? JSON.parse(String(init.body)) : null });
        if (method === "GET") {
          return Response.json([
            {
              id: "aup_generator",
              payload: {
                ...libraryProducts()[0],
                delivery: { kind: "email_link", url: "", label: "Open the policy tool" },
              },
            },
            { id: "builder_pro", payload: seedProducts()[1] },
            { id: "__settings", payload: { stripeMode: "test", taxNotice: null } },
          ]);
        }
        if (method === "DELETE") throw new Error("aup sync must not delete catalog rows");
        return Response.json([]);
      },
    });
    expect(await syncAupDelivery(remote)).toEqual(["aup_generator"]);
    const post = calls.find((call) => call.method === "POST");
    const rows = post?.body as { id: string; payload: { delivery: { kind: string } } }[];
    expect(rows.map((row) => row.id)).toEqual(["aup_generator"]);
    expect(rows[0]?.payload.delivery.kind).toBe("make_webhook");
    expect(JSON.stringify(post?.body)).not.toContain("builder_pro");
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("posts a paid aup order to Make once per Stripe event and stores a returned https URL", async () => {
    const product = {
      ...libraryProducts()[0]!,
      delivery: { kind: "email_link" as const, url: "", label: "Open the policy tool" },
    };
    const catalog = memoryCatalogStore({
      products: [product],
      settings: { stripeMode: "test", taxNotice: null },
    });
    const store = memoryEventStore();
    const orders = new Map<string, string | null>();
    const posts: Record<string, unknown>[] = [];
    const resend: { subject?: string; text?: string; html?: string }[] = [];
    const logs: string[] = [];
    const spy = vi.spyOn(console, "info").mockImplementation((message) => {
      logs.push(String(message));
    });
    const webhook = "https://make.example/hook";
    const accessUrl = "https://docs.example/token-secret";
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      if (url === webhook) {
        posts.push(body ?? {});
        return Response.json({ ok: true, access_url: accessUrl, note: "ready" });
      }
      if (url.includes("api.resend.com")) {
        resend.push(body as { subject?: string; text?: string; html?: string });
        return Response.json({ id: "email_1" });
      }
      return Response.json({});
    };
    const env = {
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "SOP Mojo <orders@sopmojo.com>",
      [AUP_MAKE_ENV]: webhook,
    } as unknown as NodeJS.ProcessEnv;
    const deps = {
      env,
      fetchImpl,
      store,
      catalog,
      saveOrderAccess: async (order: { orderId: string; accessUrl: string | null }) => {
        orders.set(order.orderId, order.accessUrl);
      },
      loadOrderAccess: async (orderId: string) => {
        if (!orders.has(orderId)) return "missing" as const;
        const value = orders.get(orderId);
        return value ? value : "pending";
      },
    };
    const source = readFileSync(path.join(process.cwd(), "lib/make-delivery.ts"), "utf8");
    expect(source).not.toContain("hook.us");
    expect(source).not.toContain(webhook);
    expect(source).toContain("env[envVar]");
    await processStripeEvent(paidLibrary("evt_aup", "aup_generator"), deps);
    await processStripeEvent(paidLibrary("evt_aup", "aup_generator"), deps);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      type: "Order",
      email: "buyer@example.com",
      first_name: "Ryan",
      last_name: "Pease",
      order_id: "cs_evt_aup",
      product_slug: AUP_SAMCART_SLUG,
      stripe_event_id: "evt_aup",
      source: "pay.sopmojo.com",
      customer: { email: "buyer@example.com", first_name: "Ryan", last_name: "Pease", phone: "555" },
      order: { id: "cs_evt_aup", total: "19.98", created_at: "2023-11-14T22:13:20.000Z" },
      products: [
        {
          id: "aup_generator",
          name: "Acceptable Use Policy Generator",
          slug: AUP_SAMCART_SLUG,
          price: "97.99",
        },
      ],
    });
    expect(JSON.stringify(posts[0])).toContain("aup_generator");
    expect(orders.get("cs_evt_aup")).toBe(accessUrl);
    expect(resend).toHaveLength(1);
    expect(resend[0]?.text).toContain(accessUrl);
    expect(resend[0]?.html).toContain(`href="${accessUrl}"`);
    expect(logs.join("\n")).not.toContain(accessUrl);
    expect(logs.join("\n")).toContain('"status":200');
    expect(logs.join("\n")).toContain('"access_url":"url"');
    expect(makeSendKey("Buyer@Example.com", "evt_aup")).toBe("buyer@example.com|evt_aup|make");
    expect(urlFromWebhookJson({ nested: { link: "https://docs.example/other" }, note: "https://docs.example/later" })).toBe(
      "https://docs.example/other",
    );
    expect(webhookBodyShape({ access_url: accessUrl, n: 1 })).toEqual({ access_url: "url", n: "number" });
    const shaped = makeOrderPayload({
      email: "buyer@example.com",
      name: "Ryan",
      phone: "",
      orderId: "cs_1",
      totalCents: 9799,
      created: 1_700_000_000,
      product: libraryProducts()[0]!,
      eventId: "evt_1",
    });
    expect(shaped.product_slug).toBe(AUP_SAMCART_SLUG);
    expect((shaped.products as { id: string }[])[0]?.id).toBe("aup_generator");
    spy.mockRestore();
  });

  it("tells the buyer the link is on its way when Make returns no URL", async () => {
    const catalog = memoryCatalogStore({
      products: [libraryProducts()[0]!],
      settings: { stripeMode: "test", taxNotice: null },
    });
    const store = memoryEventStore();
    const orders = new Map<string, string | null>();
    let posts = 0;
    const resend: { text?: string }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url === "https://make.example/hook") {
        posts += 1;
        if (posts === 1) return Response.json({ ok: true }, { status: 500 });
        return Response.json({ ok: true });
      }
      if (url.includes("api.resend.com")) {
        resend.push(JSON.parse(String(init?.body)) as { text?: string });
        return Response.json({ id: "email_1" });
      }
      return Response.json({});
    };
    const env = {
      RESEND_API_KEY: "re_test",
      [AUP_MAKE_ENV]: "https://make.example/hook",
    } as unknown as NodeJS.ProcessEnv;
    const deps = {
      env,
      fetchImpl,
      store,
      catalog,
      saveOrderAccess: async (order: { orderId: string; accessUrl: string | null }) => {
        orders.set(order.orderId, order.accessUrl);
      },
      loadOrderAccess: async (orderId: string) => (orders.has(orderId) ? ("pending" as const) : ("missing" as const)),
    };
    await expect(processStripeEvent(paidLibrary("evt_pending", "aup_generator"), deps)).rejects.toThrow(/Make webhook returned 500/);
    const sent = await processStripeEvent(paidLibrary("evt_pending", "aup_generator"), deps);
    expect(sent.duplicate).toBe(false);
    expect(posts).toBe(2);
    expect(orders.get("cs_evt_pending")).toBeNull();
    expect(resend).toHaveLength(1);
    expect(resend[0]?.text).toContain(ACCESS_LINK_ON_THE_WAY);
    expect(resend[0]?.text).toContain("Check your junk and spam folder too.");
    expect(resend[0]?.text).not.toContain("https://");
    await expect(
      openCheckoutSession({
        product: libraryProducts()[0]!,
        annual: false,
        bump: false,
        returnOrigin: "https://pay.sopmojo.com",
        snapshot: seedCatalog(),
        store: memoryCatalogStore(),
        env: {
          STRIPE_SECRET_KEY: "sk_test_unused",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unused",
        } as unknown as NodeJS.ProcessEnv,
      }),
    ).rejects.toThrow(/AUP Generator is free/);
  });
});
