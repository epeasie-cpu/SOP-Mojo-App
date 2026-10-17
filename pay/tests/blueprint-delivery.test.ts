import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as uploadDeliverableRoute } from "@/app/api/admin/deliverables/route";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { parseProduct } from "@/lib/catalog";
import { memoryCatalogStore } from "@/lib/catalog-store";
import { clearDeliverableCache, deliverableUploadError, signedDeliverableUrl, uploadDeliverable } from "@/lib/deliverables";
import {
  BLUEPRINT_EMAILED_NOTE,
  BLUEPRINT_UPSELL,
  BLUEPRINT_UPSELL_URL,
  DOWNLOAD_RESEND_MESSAGE,
  consumeDownload,
  downloadRecoveryHtml,
  downloadSendKey,
  fulfillSecureDownload,
  hashDownloadToken,
  memoryGrantStore,
  newDownloadToken,
  openDownload,
  resendDownloadLink,
  resetDownloadResendLimit,
  type DownloadGrant,
  type GrantStore,
} from "@/lib/downloads";
import { memoryEventStore } from "@/lib/event-store";
import { attachCheckoutSessionId } from "@/lib/hydrate-refund";
import {
  BLUEPRINT_ABOUT,
  BLUEPRINT_COMPARE_AT,
  BLUEPRINT_FAQ,
  BLUEPRINT_GO,
  BLUEPRINT_PATH,
  BLUEPRINT_SEO_DESCRIPTION,
  BLUEPRINT_SEO_TITLE,
  BLUEPRINT_SUPPORT,
  blueprintCheckoutHref,
  blueprintFaqJsonLd,
  blueprintProductJsonLd,
} from "@/lib/blueprint-page";
import {
  BLUEPRINT_FILENAME,
  BLUEPRINT_PRODUCT_ID,
  BLUEPRINT_STORAGE_PATH,
  NOT_AVAILABLE_YET,
  libraryProducts,
  syncBlueprintDelivery,
} from "@/lib/library";
import { openCheckoutSession } from "@/lib/open-checkout";
import { processStripeEvent } from "@/lib/process-event";
import { seedCatalog, seedProducts } from "@/lib/seed";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const storageEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
} as unknown as NodeJS.ProcessEnv;

function blueprint() {
  return libraryProducts().find((product) => product.id === BLUEPRINT_PRODUCT_ID)!;
}

function sampleGrant(token: string, overrides: Partial<DownloadGrant> = {}): DownloadGrant {
  const now = Date.now();
  return {
    id: "grant-1",
    tokenHash: hashDownloadToken(token),
    email: "buyer@example.com",
    productId: BLUEPRINT_PRODUCT_ID,
    sessionId: "cs_test_1",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
    downloadCount: 0,
    maxDownloads: 10,
    revokedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  clearDeliverableCache();
  resetDownloadResendLimit();
});

describe("Business OS Blueprint delivery", () => {
  it("rejects a bad secure file path and an entitlement on the same product", () => {
    const product = blueprint();
    expect(product.delivery).toEqual({
      kind: "secure_file",
      storagePath: BLUEPRINT_STORAGE_PATH,
      filename: BLUEPRINT_FILENAME,
    });
    expect(() =>
      parseProduct({
        ...product,
        delivery: { kind: "secure_file", storagePath: "deliverables/../secret.pdf", filename: BLUEPRINT_FILENAME },
      }),
    ).toThrow(/storagePath/);
    expect(() =>
      parseProduct({
        ...product,
        delivery: { kind: "secure_file", storagePath: BLUEPRINT_STORAGE_PATH, filename: "notes.txt" },
      }),
    ).toThrow(/filename/);
    expect(() => parseProduct({ ...product, entitlementProduct: "builder_pro" })).toThrow(/entitlement/);
  });

  it("updates only the blueprint row to the private PDF and leaves the bump off", async () => {
    const store = memoryCatalogStore(seedCatalog());
    await store.insertIfAbsent(libraryProducts());
    const snapshot = await store.read();
    await store.write({
      ...snapshot,
      products: snapshot.products.map((product) =>
        product.id === BLUEPRINT_PRODUCT_ID
          ? {
              ...product,
              delivery: { kind: "email_link" as const, url: "", label: "Download" },
              orderBump: {
                title: "keep",
                description: "Add the Business OS Diagnostic Dashboard: $4.99",
                priceCents: 499,
                entitlementProduct: null,
              },
            }
          : product,
      ),
    });
    expect(await syncBlueprintDelivery(store)).toEqual([BLUEPRINT_PRODUCT_ID]);
    expect(await syncBlueprintDelivery(store)).toEqual([]);
    const after = await store.read();
    expect(after.products.find((product) => product.id === BLUEPRINT_PRODUCT_ID)).toMatchObject({
      priceCents: 2700,
      orderBump: { title: "keep", priceCents: 499 },
      delivery: { kind: "secure_file", storagePath: BLUEPRINT_STORAGE_PATH, filename: BLUEPRINT_FILENAME },
    });
    expect(after.products.find((product) => product.id === "builder_pro")?.priceCents).toBe(3900);
    expect(after.products.find((product) => product.id === "offers_guide")?.delivery).toMatchObject({
      kind: "email_link",
      url: "",
    });
    expect(seedProducts()[1]?.annual?.priceCents).toBe(39000);
  });

  it("refuses checkout until the private PDF exists", async () => {
    const product = blueprint();
    const snapshot = { products: [product], settings: { stripeMode: "test" as const, taxNotice: null } };
    const store = memoryCatalogStore(snapshot);
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return new Response(null, { status: 404 });
    };
    await expect(
      openCheckoutSession({
        product,
        annual: false,
        bump: false,
        returnOrigin: "https://pay.sopmojo.com",
        snapshot,
        store,
        env: { STRIPE_SECRET_KEY: "sk_test_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" } as unknown as NodeJS.ProcessEnv,
        fetchImpl,
      }),
    ).rejects.toThrow(NOT_AVAILABLE_YET);
    expect(called).toBe(false);

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

    const offers = libraryProducts().find((item) => item.id === "offers_guide")!;
    called = false;
    await expect(
      openCheckoutSession({
        product: offers,
        annual: false,
        bump: false,
        returnOrigin: "https://pay.sopmojo.com",
        snapshot,
        store,
        env: { ...storageEnv, STRIPE_SECRET_KEY: "sk_test_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x" },
        fetchImpl,
      }),
    ).rejects.toThrow(NOT_AVAILABLE_YET);
    expect(called).toBe(false);
  });

  it("emails one hashed download grant per Stripe event", async () => {
    const grants = memoryGrantStore();
    const store = memoryEventStore();
    const saved: string[] = [];
    const resend: { text?: string; html?: string }[] = [];
    const env = { RESEND_API_KEY: "re_test", NEXT_PUBLIC_PAY_ORIGIN: "https://pay.sopmojo.com" } as unknown as NodeJS.ProcessEnv;
    const fetchImpl: typeof fetch = async (input, init) => {
      if (String(input).includes("api.resend.com")) {
        resend.push(JSON.parse(String(init?.body)) as { text?: string; html?: string });
        return Response.json({ id: "email_1" });
      }
      return Response.json({});
    };
    const input = {
      email: "Buyer@Example.com",
      eventId: "evt_bp",
      product: blueprint(),
      sessionId: "cs_bp_1",
      env,
      fetchImpl,
      store,
      grants,
      saveToken: async (token: string) => {
        saved.push(token);
      },
      loadToken: async () => saved[0] ?? null,
    };
    expect(await fulfillSecureDownload(input)).toBe("sent");
    expect(await fulfillSecureDownload(input)).toBe("skipped");
    expect(resend).toHaveLength(1);
    expect(downloadSendKey("Buyer@Example.com", "evt_bp")).toBe("buyer@example.com|evt_bp|download");
    expect(resend[0]?.text).toContain(`https://pay.sopmojo.com/download/${saved[0]}`);
    expect(resend[0]?.text).toContain(BLUEPRINT_UPSELL);
    expect(resend[0]?.text).toContain(BLUEPRINT_UPSELL_URL);
    expect(resend[0]?.html).toContain("Check your junk and spam folder too.");
    const row = await grants.findBySession("cs_bp_1");
    expect(row?.tokenHash).toBe(hashDownloadToken(saved[0]!));
    expect(JSON.stringify(row)).not.toContain(saved[0]);

    const failing = memoryEventStore();
    const failingGrants = memoryGrantStore();
    const kept: string[] = [];
    await expect(
      fulfillSecureDownload({
        ...input,
        eventId: "evt_fail",
        sessionId: "cs_fail",
        store: failing,
        grants: failingGrants,
        saveToken: async (token) => {
          kept.push(token);
        },
        loadToken: async () => kept[0] ?? null,
        fetchImpl: async () => new Response("no", { status: 500 }),
      }),
    ).rejects.toThrow(/Resend/);
    expect(await failing.claimCredentialSend(downloadSendKey("buyer@example.com", "evt_fail"))).toBe(true);
  });

  it("counts downloads, then refuses expired, used, revoked, and unknown tokens", async () => {
    const grants = memoryGrantStore();
    const token = newDownloadToken();
    await grants.insert(sampleGrant(token));
    for (let index = 0; index < 10; index += 1) {
      expect((await consumeDownload({ token, grants })).ok).toBe(true);
    }
    expect(await consumeDownload({ token, grants })).toEqual({ ok: false, reason: "used" });

    const expired = newDownloadToken();
    const expiredGrants = memoryGrantStore();
    await expiredGrants.insert(
      sampleGrant(expired, { id: "grant-expired", sessionId: "cs_expired", expiresAt: new Date(Date.now() - 1000).toISOString() }),
    );
    expect(await consumeDownload({ token: expired, grants: expiredGrants })).toEqual({ ok: false, reason: "expired" });
    expect((await expiredGrants.findBySession("cs_expired"))?.downloadCount).toBe(0);

    const revoked = newDownloadToken();
    const revokedGrants = memoryGrantStore();
    await revokedGrants.insert(sampleGrant(revoked, { id: "grant-revoked", sessionId: "cs_revoked", revokedAt: new Date().toISOString() }));
    expect(await consumeDownload({ token: revoked, grants: revokedGrants })).toEqual({ ok: false, reason: "revoked" });
    expect(await consumeDownload({ token: "missing-token", grants })).toEqual({ ok: false, reason: "missing" });

    const once = memoryGrantStore();
    const onceToken = newDownloadToken();
    await once.insert(sampleGrant(onceToken, { id: "grant-once", sessionId: "cs_once" }));
    const row = await once.findByHash(hashDownloadToken(onceToken));
    const [first, second] = await Promise.all([once.compareAndIncrement(row!.id, 0), once.compareAndIncrement(row!.id, 0)]);
    expect([first, second].sort()).toEqual([false, true]);
  });

  it("signs a 60-second download and does not log the URL", async () => {
    const grants = memoryGrantStore();
    const token = newDownloadToken();
    await grants.insert(sampleGrant(token));
    const seen: { body?: { expiresIn?: number }; url?: string } = {};
    const logs: string[] = [];
    const spy = vi.spyOn(console, "info").mockImplementation((message) => {
      logs.push(String(message));
    });
    const opened = await openDownload({
      token,
      grants,
      env: storageEnv,
      fetchImpl: async (input, init) => {
        seen.url = String(input);
        seen.body = init?.body ? (JSON.parse(String(init.body)) as { expiresIn?: number }) : undefined;
        return Response.json({ signedURL: "/object/sign/deliverables/business-os-blueprint.pdf?token=short-lived" });
      },
    });
    spy.mockRestore();
    expect(seen.body?.expiresIn).toBe(60);
    expect(seen.url).toContain("/storage/v1/object/sign/deliverables/business-os-blueprint.pdf");
    expect(opened).toEqual({
      redirect: "https://example.supabase.co/storage/v1/object/sign/deliverables/business-os-blueprint.pdf?token=short-lived&download=Business-OS-Blueprint.pdf",
    });
    expect(logs.join("\n")).not.toContain("short-lived");
    expect(await signedDeliverableUrl({
      storagePath: BLUEPRINT_STORAGE_PATH,
      filename: BLUEPRINT_FILENAME,
      env: storageEnv,
      fetchImpl: async () => Response.json({ signedUrl: "/object/sign/deliverables/business-os-blueprint.pdf?token=other" }),
    })).toContain("download=Business-OS-Blueprint.pdf");
  });

  it("emails a fresh link only for a paid grant and hides whether the email exists", async () => {
    const grants = memoryGrantStore();
    const token = newDownloadToken();
    await grants.insert(sampleGrant(token, { sessionId: "cs_paid" }));
    const sent: { text?: string }[] = [];
    const env = { RESEND_API_KEY: "re_test", NEXT_PUBLIC_PAY_ORIGIN: "https://pay.sopmojo.com" } as unknown as NodeJS.ProcessEnv;
    const fetchImpl: typeof fetch = async (input, init) => {
      if (String(input).includes("api.resend.com")) {
        sent.push(JSON.parse(String(init?.body)) as { text?: string });
        return Response.json({ id: "email_2" });
      }
      return Response.json({});
    };
    await resendDownloadLink({
      email: "buyer@example.com",
      productId: BLUEPRINT_PRODUCT_ID,
      ip: "198.51.100.8",
      env,
      fetchImpl,
      grants,
    });
    await resendDownloadLink({
      email: "nobody@example.com",
      productId: BLUEPRINT_PRODUCT_ID,
      ip: "198.51.100.9",
      env,
      fetchImpl,
      grants,
    });
    expect(sent).toHaveLength(1);
    const match = sent[0]?.text?.match(/https:\/\/pay\.sopmojo\.com\/download\/([A-Za-z0-9_-]+)/);
    const row = await grants.findBySession("cs_paid");
    expect(row?.tokenHash).toBe(hashDownloadToken(match?.[1] ?? ""));
    expect(row?.tokenHash).not.toBe(hashDownloadToken(token));
    expect(downloadRecoveryHtml(true)).toContain(DOWNLOAD_RESEND_MESSAGE);
    expect(downloadRecoveryHtml(true)).not.toContain("buyer@example.com");
    expect(downloadRecoveryHtml(false)).not.toContain(DOWNLOAD_RESEND_MESSAGE);

    let lookups = 0;
    const inner = memoryGrantStore();
    const wrapped: GrantStore = {
      ...inner,
      findPaidSession: async (email, productId) => {
        lookups += 1;
        return inner.findPaidSession(email, productId);
      },
    };
    for (let index = 0; index < 6; index += 1) {
      await resendDownloadLink({
        email: "buyer@example.com",
        productId: BLUEPRINT_PRODUCT_ID,
        ip: "203.0.113.9",
        env,
        fetchImpl,
        grants: wrapped,
      });
    }
    expect(lookups).toBe(5);
  });

  it("revokes the download grant when the charge is refunded", async () => {
    const grants = memoryGrantStore();
    const token = newDownloadToken();
    await grants.insert(sampleGrant(token));
    const object: Record<string, unknown> = { metadata: { email: "buyer@example.com" } };
    attachCheckoutSessionId(object, [{ id: "pi_123" }, { id: "cs_test_1" }]);
    const result = await processStripeEvent(
      {
        id: "evt_refund_bp",
        type: "charge.refunded",
        data: { object: { ...object, amount_refunded: 2700 } },
      },
      {
        env: storageEnv,
        fetchImpl: async () => Response.json({}),
        store: memoryEventStore(),
        grants,
      },
    );
    expect(result.action).toBe("ignore");
    expect((await grants.findBySession("cs_test_1"))?.revokedAt).toBeTruthy();
  });

  it("rejects a deliverable upload without an admin session", async () => {
    const response = await uploadDeliverableRoute(
      new Request("https://pay.sopmojo.com/api/admin/deliverables", { method: "POST", body: new FormData() }),
    );
    expect(response.status).toBe(401);
    expect(deliverableUploadError({ name: "notes.txt", type: "text/plain", size: 20 })).toBe("Upload a PDF.");
    expect(deliverableUploadError({ name: "book.pdf", type: "application/pdf", size: 25 * 1024 * 1024 + 1 })).toBe(
      "PDF must be 25MB or smaller.",
    );
    const calls: { url: string; method: string; upsert?: string; body: string }[] = [];
    await expect(
      uploadDeliverable({
        storagePath: BLUEPRINT_STORAGE_PATH,
        bytes: new Uint8Array([1, 2, 3, 4, 5]),
        env: storageEnv,
        fetchImpl: async () => {
          throw new Error("non-pdf must not upload");
        },
      }),
    ).rejects.toThrow(/PDF/);
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    await uploadDeliverable({
      storagePath: BLUEPRINT_STORAGE_PATH,
      bytes,
      env: storageEnv,
      fetchImpl: async (input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({
          url: String(input),
          method: init?.method ?? "GET",
          upsert: headers.get("x-upsert") ?? undefined,
          body: typeof init?.body === "string" ? init.body : "",
        });
        return Response.json({});
      },
    });
    expect(calls[0]?.url).toContain("/storage/v1/bucket");
    expect(calls[0]?.body).toContain('"public":false');
    expect(calls[1]?.url).toContain("/storage/v1/object/deliverables/business-os-blueprint.pdf");
    expect(calls[1]?.upsert).toBe("true");
    expect(readFileSync(path.join(process.cwd(), "app/api/admin/deliverables/route.ts"), "utf8")).toContain("requireAdmin");
  });

  it("publishes the sales page copy, sitemap, and thank-you upsell", async () => {
    const page = readFileSync(path.join(process.cwd(), "components/BlueprintLanding.tsx"), "utf8");
    const copy = readFileSync(path.join(process.cwd(), "lib/blueprint-page.ts"), "utf8");
    const complete = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/complete/page.tsx"), "utf8");
    const markers = [
      "The hidden ceiling",
      "What&apos;s inside",
      "The 4-System Framework",
      "Who it&apos;s for",
      "About Ryan",
      "{BLUEPRINT_SUPPORT}",
      ">Questions<",
    ];
    let at = -1;
    for (const marker of markers) {
      const next = page.indexOf(marker);
      expect(next, marker).toBeGreaterThan(at);
      at = next;
    }
    expect(page.indexOf("{BLUEPRINT_H1}")).toBeLessThan(page.indexOf("The hidden ceiling"));
    expect(page).toContain("{BLUEPRINT_COMPARE_AT}");
    expect(page).toContain("md:hidden");
    expect(page).toContain("blueprintFaqJsonLd");
    expect(page).toContain("blueprintProductJsonLd");
    expect(page).not.toMatch(/testimonial/i);
    expect(page).not.toMatch(/money-back/i);
    expect(page).not.toMatch(/30-day/i);
    expect(copy).not.toMatch(/testimonial/i);
    expect(copy).not.toMatch(/money-back/i);
    expect(copy).not.toMatch(/30-day/i);
    expect(BLUEPRINT_SEO_TITLE).toBe(
      "The Business OS Blueprint: Build SOPs & Systems That Scale ($1M to $10M) | SOP Mojo",
    );
    expect(BLUEPRINT_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(BLUEPRINT_FAQ).toHaveLength(6);
    expect(BLUEPRINT_SUPPORT).toBe("Questions? Email support");
    expect(BLUEPRINT_COMPARE_AT).toBe("$79.99");
    expect(BLUEPRINT_ABOUT).toContain("18 years");
    expect(BLUEPRINT_ABOUT).toContain("civil engineering and logistics");
    expect(JSON.stringify(blueprintFaqJsonLd())).toContain("FAQPage");
    expect(JSON.stringify(blueprintProductJsonLd(true))).toContain('"price":"27.00"');
    expect(JSON.stringify(blueprintProductJsonLd(true))).toContain("InStock");
    expect(JSON.stringify(blueprintProductJsonLd(false))).toContain("OutOfStock");
    expect(blueprintCheckoutHref(false)).toBeNull();
    expect(blueprintCheckoutHref(true)).toBe(BLUEPRINT_GO);
    const listed = await (await sitemap()).text();
    expect(listed).toContain(`https://pay.sopmojo.com${BLUEPRINT_PATH}`);
    expect(listed).not.toContain("/checkout");
    const robotsBody = await (await robots()).text();
    expect(robotsBody).toContain("Allow: /business-os-blueprint");
    expect(robotsBody).toContain("Disallow: /download");
    expect(complete).toContain("Check your email for your username and password.");
    expect(complete.indexOf('settled && product?.delivery?.kind === "secure_file"')).toBeLessThan(
      complete.indexOf("Download the Blueprint"),
    );
    expect(complete).toContain("{BLUEPRINT_UPSELL}");
    expect(complete).toContain("{BLUEPRINT_EMAILED_NOTE}");
    expect(BLUEPRINT_EMAILED_NOTE).toBe("We also emailed your download link.");
  });
});
