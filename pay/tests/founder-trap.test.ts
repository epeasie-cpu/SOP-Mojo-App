import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PATCH, POST } from "@/app/api/checkout/session/route";
import { GET as alias } from "@/app/free/founder-trap/route";
import { GET as go } from "@/app/go/[slug]/route";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { memoryCatalogStore } from "@/lib/catalog-store";
import {
  consumeDownload,
  FOUNDER_TRAP_BLUEPRINT_UPSELL,
  FOUNDER_TRAP_BLUEPRINT_UPSELL_URL,
  hashDownloadToken,
  memoryGrantStore,
  BLUEPRINT_UPSELL_URL,
} from "@/lib/downloads";
import { memoryEventStore } from "@/lib/event-store";
import {
  founderTrapClaimKey,
  founderTrapDownloadToken,
  resetFounderTrapRateLimit,
  submitFreeFounderTrap,
} from "@/lib/founder-trap";
import {
  FOUNDER_TRAP_FAQ,
  FOUNDER_TRAP_PATH,
  FOUNDER_TRAP_SEO_DESCRIPTION,
  FOUNDER_TRAP_SEO_TITLE,
  founderTrapFaqJsonLd,
  founderTrapProductJsonLd,
} from "@/lib/founder-trap-page";
import {
  FOUNDER_TRAP_FILENAME,
  FOUNDER_TRAP_PRODUCT_ID,
  FOUNDER_TRAP_STORAGE_PATH,
  FREE_FOUNDER_TRAP_CHECKOUT_ERROR,
  libraryProducts,
  syncFounderTrapDelivery,
} from "@/lib/library";
import { FOUNDER_TRAP_FREE_TAG, LEAD_MAGNET_TAG } from "@/lib/mailchimp";
import { openCheckoutSession } from "@/lib/open-checkout";
import { isNoIndexPath } from "@/lib/robots";
import { seedCatalog, seedProducts } from "@/lib/seed";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID } from "@/lib/site";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  RESEND_API_KEY: "re_test",
  MAILCHIMP_API_KEY: "key-us21",
  MAILCHIMP_AUDIENCE_ID: "override-audience",
} as unknown as NodeJS.ProcessEnv;

function guide() {
  return libraryProducts().find((product) => product.id === FOUNDER_TRAP_PRODUCT_ID)!;
}

describe("Escape the Founder Trap", () => {
  it("seeds a free lead magnet and updates an older paid row", async () => {
    const product = guide();
    expect(product.leadMagnet).toBe(true);
    expect(product.priceCents).toBe(0);
    expect(product.delivery).toEqual({
      kind: "secure_file",
      storagePath: FOUNDER_TRAP_STORAGE_PATH,
      filename: FOUNDER_TRAP_FILENAME,
    });
    const store = memoryCatalogStore(seedCatalog());
    await store.insertIfAbsent(
      libraryProducts().map((item) =>
        item.id === FOUNDER_TRAP_PRODUCT_ID
          ? { ...item, leadMagnet: false, priceCents: 1998, delivery: { kind: "email_link" as const, url: "", label: "Download" } }
          : item,
      ),
    );
    expect(await syncFounderTrapDelivery(store)).toEqual([FOUNDER_TRAP_PRODUCT_ID]);
    expect(await syncFounderTrapDelivery(store)).toEqual([]);
    const after = await store.read();
    expect(after.products.find((item) => item.id === FOUNDER_TRAP_PRODUCT_ID)).toMatchObject({
      leadMagnet: true,
      priceCents: 0,
      delivery: { kind: "secure_file", storagePath: FOUNDER_TRAP_STORAGE_PATH, filename: FOUNDER_TRAP_FILENAME },
    });
    expect(after.products.find((item) => item.id === "builder_pro")?.priceCents).toBe(3900);
    expect(after.products.find((item) => item.id === "business_os_blueprint")?.priceCents).toBe(2700);
    expect(after.products.find((item) => item.id === "offers_guide")?.priceCents).toBe(1999);
  });

  it("emails one download link, tags Mailchimp, and does not repeat the grant", async () => {
    resetFounderTrapRateLimit();
    const grants = memoryGrantStore();
    const store = memoryEventStore();
    const calls: { url: string; body: unknown }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, body });
      if (url.includes("mailchimp.com") && url.endsWith("/tags")) return new Response("{}", { status: 200 });
      if (url.includes("mailchimp.com")) return new Response("{}", { status: 200 });
      if (url.includes("resend.com")) return new Response("{}", { status: 200 });
      return new Response("missing", { status: 404 });
    };
    const first = await submitFreeFounderTrap({
      email: "Founder@Example.com",
      name: "Ryan",
      company: "",
      ip: "10.0.0.8",
      env,
      fetchImpl,
      store,
      grants,
      now: 1_000,
      fileReady: true,
    });
    expect(first.ok).toBe(true);
    if (!first.ok || !first.downloadToken) throw new Error("expected a download token");
    expect(founderTrapDownloadToken(first.downloadToken)).toBe(first.downloadToken);
    const grant = await grants.findByHash(hashDownloadToken(first.downloadToken));
    expect(grant).toMatchObject({
      email: "founder@example.com",
      productId: FOUNDER_TRAP_PRODUCT_ID,
      downloadCount: 0,
      maxDownloads: 10,
      revokedAt: null,
    });
    expect(Date.parse(grant!.expiresAt) - Date.parse(grant!.createdAt)).toBe(30 * 24 * 60 * 60 * 1000);
    expect(grant?.sessionId.startsWith("free_")).toBe(true);
    const resend = calls.filter((call) => call.url.includes("resend.com"));
    expect(resend).toHaveLength(1);
    const text = JSON.stringify(resend[0]?.body);
    expect(text).toContain(FOUNDER_TRAP_BLUEPRINT_UPSELL);
    expect(text.indexOf(FOUNDER_TRAP_BLUEPRINT_UPSELL_URL)).toBeLessThan(text.indexOf(BLUEPRINT_UPSELL_URL));
    expect(text).not.toContain("checkout");
    const member = calls.find((call) => call.url.includes("/members/") && !call.url.endsWith("/tags"));
    expect(member?.url).toContain(DEFAULT_MAILCHIMP_AUDIENCE_ID);
    expect(member?.url).not.toContain("override-audience");
    expect(member?.body).toMatchObject({ merge_fields: { FNAME: "Ryan" } });
    const tags = calls.find((call) => call.url.endsWith("/tags"));
    expect(tags?.body).toEqual({
      tags: [
        { name: FOUNDER_TRAP_FREE_TAG, status: "active" },
        { name: LEAD_MAGNET_TAG, status: "active" },
      ],
    });
    expect(founderTrapClaimKey("Founder@Example.com")).toBe("founder@example.com|founder-trap-free");

    const again = await submitFreeFounderTrap({
      email: "founder@example.com",
      name: "Ryan",
      company: "",
      ip: "10.0.0.9",
      env,
      fetchImpl,
      store,
      grants,
      now: 2_000,
      fileReady: true,
    });
    expect(again).toEqual({ ok: true, downloadToken: null });
    expect(calls.filter((call) => call.url.includes("resend.com"))).toHaveLength(1);

    const downloaded = await consumeDownload({ token: first.downloadToken, grants, now: 2_000 });
    expect(downloaded).toEqual({
      ok: true,
      storagePath: FOUNDER_TRAP_STORAGE_PATH,
      filename: FOUNDER_TRAP_FILENAME,
    });
  });

  it("stays coming soon until the file exists and releases the claim when email fails", async () => {
    resetFounderTrapRateLimit();
    const quiet: typeof fetch = async () => {
      throw new Error("should not be called");
    };
    const soon = await submitFreeFounderTrap({
      email: "founder@example.com",
      name: "",
      company: "",
      ip: "10.1.0.1",
      env: {} as NodeJS.ProcessEnv,
      fetchImpl: quiet,
      now: 3_000,
    });
    expect(soon).toEqual({ ok: false, code: "soon" });

    const honeypot = await submitFreeFounderTrap({
      email: "founder@example.com",
      name: "Ryan",
      company: "Acme",
      ip: "10.1.0.1",
      env,
      fetchImpl: quiet,
      now: 4_000,
      fileReady: true,
    });
    expect(honeypot).toEqual({ ok: true, downloadToken: null });

    const grants = memoryGrantStore();
    const store = memoryEventStore();
    let resendStatus = 500;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("resend.com")) return new Response("no", { status: resendStatus });
      return new Response("{}", { status: 200 });
    };
    const failed = await submitFreeFounderTrap({
      email: "retry@example.com",
      name: "",
      company: "",
      ip: "10.1.0.2",
      env,
      fetchImpl,
      store,
      grants,
      now: 5_000,
      fileReady: true,
    });
    expect(failed).toEqual({ ok: false, code: "send" });
    expect(await grants.findPaidSession("retry@example.com", FOUNDER_TRAP_PRODUCT_ID)).toBeNull();
    resendStatus = 200;
    const sent = await submitFreeFounderTrap({
      email: "retry@example.com",
      name: "",
      company: "",
      ip: "10.1.0.2",
      env,
      fetchImpl,
      store,
      grants,
      now: 6_000,
      fileReady: true,
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok || !sent.downloadToken) throw new Error("expected a retry token");
    expect(await grants.findByHash(hashDownloadToken(sent.downloadToken))).not.toBeNull();
  });

  it("publishes the free page, blocks checkout, and cross-links the three guides", async () => {
    const page = readFileSync(path.join(process.cwd(), "components/FounderTrapLanding.tsx"), "utf8");
    const copy = readFileSync(path.join(process.cwd(), "lib/founder-trap-page.ts"), "utf8");
    const ready = readFileSync(path.join(process.cwd(), "components/FounderTrapReady.tsx"), "utf8");
    const blueprint = readFileSync(path.join(process.cwd(), "components/BlueprintLanding.tsx"), "utf8");
    const offers = readFileSync(path.join(process.cwd(), "components/OffersLanding.tsx"), "utf8");
    expect(FOUNDER_TRAP_SEO_TITLE).toBe(
      "Escape the Founder Trap: Free Guide to Stop Being Your Business's Bottleneck | SOP Mojo",
    );
    expect(FOUNDER_TRAP_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(FOUNDER_TRAP_SEO_DESCRIPTION).toContain("founder trap");
    expect(FOUNDER_TRAP_SEO_DESCRIPTION).toContain("founder dependency");
    expect(FOUNDER_TRAP_SEO_DESCRIPTION).toContain("how to stop being the bottleneck in your business");
    expect(FOUNDER_TRAP_SEO_DESCRIPTION).toContain("owner dependent business");
    expect(copy).toContain("founder trap");
    expect(copy).toContain("founder dependency");
    expect(copy).toContain("how to stop being the bottleneck in your business");
    expect(copy).toContain("owner dependent business");
    expect(page).toContain("{FOUNDER_TRAP_COMING_SOON}");
    expect(page).toContain('name="email"');
    expect(page).toContain('name="name"');
    expect(page).toContain("founderTrapFaqJsonLd");
    expect(page).not.toMatch(/testimonial/i);
    expect(page).not.toMatch(/money-back/i);
    expect(page).not.toMatch(/30-day/i);
    expect(FOUNDER_TRAP_FAQ).toHaveLength(6);
    expect(JSON.stringify(founderTrapFaqJsonLd())).toContain("FAQPage");
    expect(JSON.stringify(founderTrapProductJsonLd(false))).toContain('"price":"0.00"');
    expect(JSON.stringify(founderTrapProductJsonLd(false))).toContain("OutOfStock");
    expect(JSON.stringify(founderTrapProductJsonLd(true))).toContain("InStock");
    expect(page).toContain("BLUEPRINT_PATH");
    expect(page).toContain("OFFERS_PATH");
    expect(blueprint).toContain("FOUNDER_TRAP_PATH");
    expect(offers).toContain("FOUNDER_TRAP_PATH");
    expect(ready.indexOf("FOUNDER_TRAP_BLUEPRINT_UPSELL")).toBeLessThan(ready.indexOf("{BLUEPRINT_UPSELL}"));
    expect(ready).toContain("Download the guide");
    expect(ready).toContain("href={FOUNDER_TRAP_BLUEPRINT_UPSELL_URL}");
    expect(FOUNDER_TRAP_BLUEPRINT_UPSELL).toBe(
      "Ready for the full blueprint? The 4-System Framework to scale from $1M to $10M.",
    );
    expect(FOUNDER_TRAP_BLUEPRINT_UPSELL_URL).toBe("https://pay.sopmojo.com/go/business_os_blueprint");

    const listed = await (await sitemap()).text();
    expect(listed).toContain(`https://pay.sopmojo.com${FOUNDER_TRAP_PATH}`);
    expect(listed).not.toContain("/p/founder_trap_guide");
    expect(listed).not.toContain("/free/founder-trap");
    const robotsBody = await (await robots()).text();
    expect(robotsBody).toContain("Allow: /escape-the-founder-trap");
    expect(isNoIndexPath("/escape-the-founder-trap")).toBe(false);
    expect(isNoIndexPath("/escape-the-founder-trap/ready")).toBe(true);

    const hop = await alias(new Request("https://pay.sopmojo.com/free/founder-trap"));
    expect(hop.status).toBe(302);
    expect(hop.headers.get("location")).toBe(`https://pay.sopmojo.com${FOUNDER_TRAP_PATH}`);
    const missing = await go(new Request("https://pay.sopmojo.com/go/founder_trap_guide"), {
      params: Promise.resolve({ slug: "founder_trap_guide" }),
    });
    expect(missing.status).toBe(302);
    expect(missing.headers.get("location")).toBe(`https://pay.sopmojo.com${FOUNDER_TRAP_PATH}`);

    const session = await POST(
      new Request("https://pay.sopmojo.com/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({ slug: "founder_trap_guide", email: "buyer@example.com" }),
      }),
    );
    expect(session.status).toBe(409);
    expect(await session.json()).toEqual({ error: FREE_FOUNDER_TRAP_CHECKOUT_ERROR });
    const patched = await PATCH(
      new Request("https://pay.sopmojo.com/api/checkout/session", {
        method: "PATCH",
        body: JSON.stringify({ sessionId: "cs_test", slug: "founder-trap-guide", email: "buyer@example.com" }),
      }),
    );
    expect(patched.status).toBe(409);
    await expect(
      openCheckoutSession({
        product: guide(),
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
    ).rejects.toThrow(FREE_FOUNDER_TRAP_CHECKOUT_ERROR);
    expect(seedProducts()[1]?.priceCents).toBe(3900);
  });
});
