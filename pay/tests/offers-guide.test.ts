import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { memoryCatalogStore } from "@/lib/catalog-store";
import { clearDeliverableCache } from "@/lib/deliverables";
import {
  BLUEPRINT_UPSELL,
  BLUEPRINT_UPSELL_URL,
  OFFERS_BLUEPRINT_UPSELL,
  OFFERS_BLUEPRINT_UPSELL_URL,
  consumeDownload,
  fulfillSecureDownload,
  hashDownloadToken,
  memoryGrantStore,
  newDownloadToken,
} from "@/lib/downloads";
import { memoryEventStore } from "@/lib/event-store";
import {
  BLUEPRINT_FILENAME,
  BLUEPRINT_PRODUCT_ID,
  BLUEPRINT_STORAGE_PATH,
  NOT_AVAILABLE_YET,
  OFFERS_FILENAME,
  OFFERS_PRICE_CENTS,
  OFFERS_PRODUCT_ID,
  OFFERS_STORAGE_PATH,
  libraryProducts,
  syncOffersDelivery,
} from "@/lib/library";
import { openCheckoutSession } from "@/lib/open-checkout";
import {
  OFFERS_COMPARE_AT,
  OFFERS_FAQ,
  OFFERS_GO,
  OFFERS_PATH,
  OFFERS_SEO_DESCRIPTION,
  OFFERS_SEO_TITLE,
  OFFERS_SUPPORT,
  offersCheckoutHref,
  offersFaqJsonLd,
  offersProductJsonLd,
} from "@/lib/offers-page";
import { seedCatalog } from "@/lib/seed";
import type { DownloadGrant } from "@/lib/downloads";

const storageEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
} as unknown as NodeJS.ProcessEnv;

function offersProduct() {
  return libraryProducts().find((product) => product.id === OFFERS_PRODUCT_ID)!;
}

beforeEach(() => {
  clearDeliverableCache();
});

describe("high-converting offers guide", () => {
  it("seeds the guide at $19.99 as a private PDF", () => {
    const product = offersProduct();
    expect(product.priceCents).toBe(1999);
    expect(OFFERS_PRICE_CENTS).toBe(1999);
    expect(product.delivery).toEqual({
      kind: "secure_file",
      storagePath: OFFERS_STORAGE_PATH,
      filename: OFFERS_FILENAME,
    });
    expect(product.orderBump).toBeNull();
    expect(product.billing).toBe("once");
  });

  it("updates an existing $19.98 email link without rewriting the other products", async () => {
    const store = memoryCatalogStore(seedCatalog());
    await store.insertIfAbsent(libraryProducts());
    const snapshot = await store.read();
    await store.write({
      ...snapshot,
      products: snapshot.products.map((product) =>
        product.id === OFFERS_PRODUCT_ID
          ? { ...product, priceCents: 1998, delivery: { kind: "email_link" as const, url: "", label: "Download" } }
          : product,
      ),
    });
    expect(await syncOffersDelivery(store)).toEqual([OFFERS_PRODUCT_ID]);
    expect(await syncOffersDelivery(store)).toEqual([]);
    const after = await store.read();
    expect(after.products.find((product) => product.id === OFFERS_PRODUCT_ID)).toMatchObject({
      priceCents: 1999,
      delivery: { kind: "secure_file", storagePath: OFFERS_STORAGE_PATH, filename: OFFERS_FILENAME },
    });
    expect(after.products.find((product) => product.id === "builder_pro")?.priceCents).toBe(3900);
    expect(after.products.find((product) => product.id === BLUEPRINT_PRODUCT_ID)).toMatchObject({
      priceCents: 2700,
      delivery: { kind: "secure_file", storagePath: BLUEPRINT_STORAGE_PATH, filename: BLUEPRINT_FILENAME },
    });
  });

  it("stays unavailable until the offers PDF exists", async () => {
    const product = offersProduct();
    const snapshot = { products: [product], settings: { stripeMode: "test" as const, taxNotice: null } };
    const store = memoryCatalogStore(snapshot);
    let called = false;
    await expect(
      openCheckoutSession({
        product,
        annual: false,
        bump: false,
        returnOrigin: "https://pay.sopmojo.com",
        snapshot,
        store,
        env: {
          ...storageEnv,
          STRIPE_SECRET_KEY: "sk_test_x",
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
        },
        fetchImpl: async () => {
          called = true;
          return new Response(null, { status: 404 });
        },
      }),
    ).rejects.toThrow(NOT_AVAILABLE_YET);
    expect(called).toBe(true);
    clearDeliverableCache();
    await expect(
      openCheckoutSession({
        product,
        annual: false,
        bump: false,
        returnOrigin: "https://pay.sopmojo.com",
        snapshot,
        store,
        env: storageEnv,
        fetchImpl: async () => new Response(null, { status: 200 }),
      }),
    ).rejects.toThrow(/Stripe/);
  });

  it("emails the Blueprint offer before Builder Pro", async () => {
    const grants = memoryGrantStore();
    const saved: string[] = [];
    const resend: { text?: string }[] = [];
    await fulfillSecureDownload({
      email: "buyer@example.com",
      eventId: "evt_offers",
      product: offersProduct(),
      sessionId: "cs_offers_1",
      env: { RESEND_API_KEY: "re_test", NEXT_PUBLIC_PAY_ORIGIN: "https://pay.sopmojo.com" } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async (input, init) => {
        if (String(input).includes("api.resend.com")) {
          resend.push(JSON.parse(String(init?.body)) as { text?: string });
          return Response.json({ id: "email_offers" });
        }
        return Response.json({});
      },
      store: memoryEventStore(),
      grants,
      saveToken: async (token) => {
        saved.push(token);
      },
      loadToken: async () => saved[0] ?? null,
    });
    const text = resend[0]?.text ?? "";
    expect(text).toContain(`https://pay.sopmojo.com/download/${saved[0]}`);
    expect(text.indexOf(OFFERS_BLUEPRINT_UPSELL)).toBeGreaterThan(-1);
    expect(text.indexOf(OFFERS_BLUEPRINT_UPSELL_URL)).toBeLessThan(text.indexOf(BLUEPRINT_UPSELL_URL));
    expect(text).toContain(BLUEPRINT_UPSELL);
    const row = await grants.findBySession("cs_offers_1");
    expect(row?.tokenHash).toBe(hashDownloadToken(saved[0]!));

    const token = newDownloadToken();
    const downloadGrants = memoryGrantStore();
    const grant: DownloadGrant = {
      id: "grant-offers",
      tokenHash: hashDownloadToken(token),
      email: "buyer@example.com",
      productId: OFFERS_PRODUCT_ID,
      sessionId: "cs_offers_file",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      downloadCount: 0,
      maxDownloads: 10,
      revokedAt: null,
    };
    await downloadGrants.insert(grant);
    expect(await consumeDownload({ token, grants: downloadGrants })).toEqual({
      ok: true,
      storagePath: OFFERS_STORAGE_PATH,
      filename: OFFERS_FILENAME,
    });
  });

  it("publishes the offers sales page and cross-links both guides", async () => {
    const page = readFileSync(path.join(process.cwd(), "components/OffersLanding.tsx"), "utf8");
    const blueprint = readFileSync(path.join(process.cwd(), "components/BlueprintLanding.tsx"), "utf8");
    const also = readFileSync(path.join(process.cwd(), "components/YouMayAlsoLike.tsx"), "utf8");
    const complete = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/complete/page.tsx"), "utf8");
    const markers = [
      "What an offer is not",
      "What&apos;s inside",
      "The offer framework",
      "Who it&apos;s for",
      "About Ryan",
      "{OFFERS_SUPPORT}",
      ">Questions<",
    ];
    let at = -1;
    for (const marker of markers) {
      const next = page.indexOf(marker);
      expect(next, marker).toBeGreaterThan(at);
      at = next;
    }
    expect(page.indexOf("{OFFERS_H1}")).toBeLessThan(page.indexOf("What an offer is not"));
    expect(page).toContain("md:hidden");
    expect(page).toContain("offersFaqJsonLd");
    expect(page).toContain("offersProductJsonLd");
    expect(page).not.toMatch(/testimonial/i);
    expect(page).not.toMatch(/money-back/i);
    expect(page).not.toMatch(/30-day/i);
    expect(OFFERS_SEO_TITLE).toBe("How to Create High-Converting Offers: The 2026 Guide | SOP Mojo");
    expect(OFFERS_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(OFFERS_SEO_DESCRIPTION).toContain("high converting offer");
    expect(OFFERS_SEO_DESCRIPTION).toContain("bonus stacking");
    expect(OFFERS_COMPARE_AT).toBe("$67.99");
    expect(OFFERS_SUPPORT).toBe("Questions? Email support");
    expect(OFFERS_FAQ).toHaveLength(6);
    expect(JSON.stringify(offersFaqJsonLd())).toContain("FAQPage");
    expect(JSON.stringify(offersProductJsonLd(false))).toContain('"price":"19.99"');
    expect(JSON.stringify(offersProductJsonLd(false))).toContain("OutOfStock");
    expect(JSON.stringify(offersProductJsonLd(true))).toContain("InStock");
    expect(offersCheckoutHref(false)).toBeNull();
    expect(offersCheckoutHref(true)).toBe(OFFERS_GO);
    expect(also).toContain("You may also like");
    expect(page).toContain("YouMayAlsoLike");
    expect(page).toContain("BLUEPRINT_PATH");
    expect(blueprint).toContain("YouMayAlsoLike");
    expect(blueprint).toContain("OFFERS_PATH");
    const listed = await (await sitemap()).text();
    expect(listed).toContain(`https://pay.sopmojo.com${OFFERS_PATH}`);
    expect(listed).toContain("https://pay.sopmojo.com/business-os-blueprint");
    const robotsBody = await (await robots()).text();
    expect(robotsBody).toContain("Allow: /high-converting-offers-guide");
    expect(complete.indexOf("href={OFFERS_BLUEPRINT_UPSELL_URL}")).toBeLessThan(complete.indexOf("href={BLUEPRINT_UPSELL_URL}"));
    expect(complete).toContain("Download the guide");
    expect(OFFERS_BLUEPRINT_UPSELL).toBe("The Business OS Blueprint — $27");
    expect(OFFERS_BLUEPRINT_UPSELL_URL).toBe("https://pay.sopmojo.com/go/business_os_blueprint");
  });
});
