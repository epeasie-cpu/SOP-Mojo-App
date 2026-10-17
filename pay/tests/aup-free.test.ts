import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, PATCH } from "@/app/api/checkout/session/route";
import { GET } from "@/app/go/[slug]/route";
import {
  AUP_FREE_EMAIL_LEAD,
  AUP_FREE_HEADLINE,
  AUP_FREE_SPAM,
  AUP_FREE_UPSELL,
  BUILDER_PRO_GO,
  FREE_AUP_RATE_WINDOW_MS,
  freeAupClaimKey,
  freeAupEmail,
  resetFreeAupRateLimit,
  submitFreeAup,
} from "@/lib/aup-free";
import { memoryCatalogStore } from "@/lib/catalog-store";
import { credentialSendKey, memoryEventStore } from "@/lib/event-store";
import {
  AUP_MAKE_ENV,
  AUP_SAMCART_SLUG,
  FREE_AUP_CHECKOUT_ERROR,
  FREE_AUP_PATH,
  libraryProducts,
} from "@/lib/library";
import { makeOrderPayload } from "@/lib/make-delivery";
import { AUP_FREE_LEAD_TAG } from "@/lib/mailchimp";
import { openCheckoutSession } from "@/lib/open-checkout";
import { seedCatalog, seedProducts } from "@/lib/seed";

const webhook = "https://make.example/hook";

beforeEach(() => {
  resetFreeAupRateLimit();
});

function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    RESEND_API_KEY: "re_test",
    MAILCHIMP_API_KEY: "key-us21",
    MAILCHIMP_AUDIENCE_ID: "other-audience",
    [AUP_MAKE_ENV]: webhook,
    ...extra,
  } as unknown as NodeJS.ProcessEnv;
}

describe("free AUP gate", () => {
  it("keeps other prices and sends a zero-dollar Make order once per email", async () => {
    expect(seedProducts().find((product) => product.id === "builder_pro")?.priceCents).toBe(3900);
    expect(seedProducts().find((product) => product.id === "flowchart_plus")?.priceCents).toBe(1900);
    expect(libraryProducts().find((product) => product.id === "aup_generator")?.priceCents).toBe(9799);
    expect(AUP_FREE_UPSELL).toBe("Turn your policies into SOPs your team actually follows. Builder Pro $39/mo");
    expect(BUILDER_PRO_GO).toBe("https://pay.sopmojo.com/go/builder_pro");

    const paid = makeOrderPayload({
      email: "buyer@example.com",
      name: "Ryan Pease",
      phone: "",
      orderId: "cs_1",
      totalCents: 9799,
      created: 1_700_000_000,
      product: libraryProducts()[0]!,
      eventId: "evt_1",
    });
    expect(paid).not.toHaveProperty("free");
    expect((paid.order as { total: string }).total).toBe("97.99");
    expect((paid.products as { price: string }[])[0]?.price).toBe("97.99");

    const posts: Record<string, unknown>[] = [];
    const mail: { url: string; method: string; body: Record<string, unknown> | null }[] = [];
    const resend: { subject?: string; text?: string; html?: string }[] = [];
    const logs: string[] = [];
    const spy = vi.spyOn(console, "info").mockImplementation((line) => {
      logs.push(String(line));
    });
    const accessUrl = "https://docs.example/token-secret";
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      if (url === webhook) {
        posts.push(body ?? {});
        return Response.json({ access_url: accessUrl });
      }
      if (url.includes("api.mailchimp.com")) {
        mail.push({ url, method: init?.method ?? "GET", body });
        return new Response("{}", { status: 200 });
      }
      if (url.includes("api.resend.com")) {
        resend.push(body as { subject?: string; text?: string; html?: string });
        return Response.json({ id: "email_1" });
      }
      return Response.json({});
    };
    const store = memoryEventStore();
    const first = await submitFreeAup({
      email: "Buyer@Example.com",
      firstName: "Ryan",
      company: "",
      ip: "203.0.113.10",
      env: env(),
      fetchImpl,
      store,
      now: 1_700_000_000_000,
      orderId: "free_11111111-1111-1111-1111-111111111111",
    });
    expect(first).toEqual({ ok: true });
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      type: "Order",
      free: true,
      email: "buyer@example.com",
      first_name: "Ryan",
      last_name: "",
      order_id: "free_11111111-1111-1111-1111-111111111111",
      product_slug: AUP_SAMCART_SLUG,
      stripe_event_id: "free_11111111-1111-1111-1111-111111111111",
      source: "pay.sopmojo.com",
      customer: { email: "buyer@example.com", first_name: "Ryan", last_name: "", phone: "" },
      order: { id: "free_11111111-1111-1111-1111-111111111111", total: "0.00" },
      products: [
        {
          id: "aup_generator",
          name: "Acceptable Use Policy Generator",
          slug: AUP_SAMCART_SLUG,
          price: "0.00",
        },
      ],
    });
    expect(String(posts[0]?.order_id)).toMatch(/^free_/);
    const member = mail.find((call) => call.method === "PUT");
    const tags = mail.find((call) => call.method === "POST");
    expect(member?.url).toContain("/lists/7c2226f741/members/");
    expect(member?.url).not.toContain("other-audience");
    expect(member?.body).toMatchObject({
      email_address: "buyer@example.com",
      status_if_new: "subscribed",
      merge_fields: { FNAME: "Ryan" },
    });
    expect(tags?.body).toEqual({ tags: [{ name: AUP_FREE_LEAD_TAG, status: "active" }] });
    expect(JSON.stringify(tags?.body)).not.toContain("checkout");
    expect(resend).toHaveLength(1);
    expect(resend[0]?.subject).toBe(AUP_FREE_EMAIL_LEAD);
    expect(resend[0]?.text).toContain(AUP_FREE_EMAIL_LEAD);
    expect(resend[0]?.text).toContain(AUP_FREE_SPAM);
    expect(resend[0]?.text).toContain(AUP_FREE_UPSELL);
    expect(resend[0]?.text).toContain(BUILDER_PRO_GO);
    expect(resend[0]?.text).toContain(accessUrl);
    expect(resend[0]?.html).toContain(`href="${BUILDER_PRO_GO}"`);
    expect(resend[0]?.html).toContain(AUP_FREE_UPSELL);
    expect(logs.join("\n")).not.toContain(accessUrl);
    expect(logs.join("\n")).toContain('"source":"aup_free"');
    expect(logs.join("\n")).toContain('"status":200');
    expect(credentialSendKey(freeAupClaimKey("Buyer@Example.com"))).toBe("buyer@example.com|aup-free");

    const again = await submitFreeAup({
      email: "buyer@example.com",
      firstName: "Ryan",
      company: "",
      ip: "203.0.113.10",
      env: env(),
      fetchImpl,
      store,
      orderId: "free_should-not-post",
    });
    expect(again).toEqual({ ok: true });
    expect(posts).toHaveLength(1);
    expect(resend).toHaveLength(1);
    spy.mockRestore();
  });

  it("pretends the honeypot succeeded and does not call Mailchimp, Make, or Resend", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return Response.json({});
    };
    const store = memoryEventStore();
    const result = await submitFreeAup({
      email: "buyer@example.com",
      firstName: "Ryan",
      company: "Acme",
      ip: "203.0.113.11",
      env: env(),
      fetchImpl,
      store,
    });
    expect(result).toEqual({ ok: true });
    expect(calls).toBe(0);
    expect(await store.claimCredentialSend("buyer@example.com|aup-free")).toBe(true);
  });

  it("rate limits an address after five submits and does not burn a claim when Make is unset", async () => {
    const posts: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      posts.push(String(input));
      return Response.json({ ok: true });
    };
    const store = memoryEventStore();
    for (let i = 0; i < 5; i += 1) {
      const result = await submitFreeAup({
        email: `buyer${i}@example.com`,
        firstName: "",
        company: "",
        ip: "203.0.113.12",
        env: env(),
        fetchImpl,
        store,
        now: 1_000,
        orderId: `free_rate_${i}`,
      });
      expect(result.ok).toBe(true);
    }
    const blocked = await submitFreeAup({
      email: "sixth@example.com",
      firstName: "",
      company: "",
      ip: "203.0.113.12",
      env: env(),
      fetchImpl,
      store,
      now: 1_000,
      orderId: "free_rate_blocked",
    });
    expect(blocked).toEqual({ ok: false, code: "rate" });
    expect(posts.filter((url) => url === webhook)).toHaveLength(5);
    expect(await store.claimCredentialSend("sixth@example.com|aup-free")).toBe(true);
    await store.releaseCredentialSend("sixth@example.com|aup-free");

    const later = await submitFreeAup({
      email: "sixth@example.com",
      firstName: "",
      company: "",
      ip: "203.0.113.12",
      env: env(),
      fetchImpl,
      store,
      now: 1_000 + FREE_AUP_RATE_WINDOW_MS,
      orderId: "free_rate_later",
    });
    expect(later.ok).toBe(true);
    expect(posts.filter((url) => url === webhook)).toHaveLength(6);

    const missing = memoryEventStore();
    const held = await submitFreeAup({
      email: "buyer@example.com",
      firstName: "",
      company: "",
      ip: "203.0.113.13",
      env: { RESEND_API_KEY: "re_test" } as unknown as NodeJS.ProcessEnv,
      fetchImpl: async () => {
        throw new Error("should not be called");
      },
      store: missing,
    });
    expect(held).toEqual({ ok: false, code: "send" });
    expect(await missing.claimCredentialSend("buyer@example.com|aup-free")).toBe(true);
  });

  it("releases the claim when Make fails and still emails when Mailchimp fails", async () => {
    let makeStatus = 500;
    let posts = 0;
    const resend: { text?: string }[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url === webhook) {
        posts += 1;
        return Response.json({ ok: true }, { status: makeStatus });
      }
      if (url.includes("api.mailchimp.com")) return new Response("no", { status: 500 });
      if (url.includes("api.resend.com")) {
        resend.push({ text: "sent" });
        return Response.json({ id: "email_1" });
      }
      return Response.json({});
    };
    const store = memoryEventStore();
    const failed = await submitFreeAup({
      email: "buyer@example.com",
      firstName: "",
      company: "",
      ip: "203.0.113.14",
      env: env(),
      fetchImpl,
      store,
      orderId: "free_retry",
    });
    expect(failed).toEqual({ ok: false, code: "send" });
    expect(posts).toBe(1);
    makeStatus = 200;
    const sent = await submitFreeAup({
      email: "buyer@example.com",
      firstName: "",
      company: "",
      ip: "203.0.113.14",
      env: env(),
      fetchImpl,
      store,
      orderId: "free_retry",
    });
    expect(sent).toEqual({ ok: true });
    expect(posts).toBe(2);
    expect(resend).toHaveLength(1);
    expect(freeAupEmail(null).text).toContain(AUP_FREE_SPAM);
    expect(freeAupEmail(null).text).toContain(BUILDER_PRO_GO);
    expect(freeAupEmail(null).text.split(AUP_FREE_UPSELL)[0]).not.toContain("https://");
  });

  it("redirects go and checkout away from a paid AUP session", async () => {
    const missing = await GET(new Request("https://pay.sopmojo.com/go/aup_generator"), {
      params: Promise.resolve({ slug: "aup_generator" }),
    });
    expect(missing.status).toBe(302);
    expect(missing.headers.get("location")).toBe("https://pay.sopmojo.com/free/aup-generator");
    const hyphen = await GET(new Request("https://pay.sopmojo.com/go/aup-generator"), {
      params: Promise.resolve({ slug: "aup-generator" }),
    });
    expect(hyphen.status).toBe(302);
    expect(hyphen.headers.get("location")).toBe(`${"https://pay.sopmojo.com"}${FREE_AUP_PATH}`);

    const checkout = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/page.tsx"), "utf8");
    const pageFn = checkout.slice(checkout.indexOf("export default async function CheckoutPage"));
    expect(pageFn.indexOf("isFreeAupSlug")).toBeGreaterThan(-1);
    expect(pageFn.indexOf("isFreeAupSlug")).toBeLessThan(pageFn.indexOf("findProduct"));
    expect(pageFn).toContain("redirect(FREE_AUP_PATH)");

    const go = readFileSync(path.join(process.cwd(), "app/go/[slug]/route.ts"), "utf8");
    const goFn = go.slice(go.indexOf("export async function GET"));
    expect(goFn.indexOf("isFreeAupSlug")).toBeLessThan(goFn.indexOf("findProduct"));
    expect(goFn.indexOf("isFreeAupSlug")).toBeLessThan(goFn.indexOf("product.active"));

    const session = await POST(
      new Request("https://pay.sopmojo.com/api/checkout/session", {
        method: "POST",
        body: JSON.stringify({ slug: "aup_generator", email: "buyer@example.com" }),
      }),
    );
    expect(session.status).toBe(409);
    expect(await session.json()).toEqual({ error: FREE_AUP_CHECKOUT_ERROR });
    const patched = await PATCH(
      new Request("https://pay.sopmojo.com/api/checkout/session", {
        method: "PATCH",
        body: JSON.stringify({ sessionId: "cs_test", slug: "aup-generator", email: "buyer@example.com" }),
      }),
    );
    expect(patched.status).toBe(409);

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
    ).rejects.toThrow(FREE_AUP_CHECKOUT_ERROR);
    await expect(
      openCheckoutSession({
        product: seedProducts().find((product) => product.id === "builder_pro")!,
        annual: false,
        bump: false,
        returnOrigin: "https://pay.sopmojo.com",
        snapshot: seedCatalog(),
        store: memoryCatalogStore(),
        env: {} as NodeJS.ProcessEnv,
      }),
    ).rejects.toThrow(/Stripe/);

    const form = readFileSync(path.join(process.cwd(), "components/AupLanding.tsx"), "utf8");
    const ready = readFileSync(path.join(process.cwd(), "app/free/aup-generator/ready/page.tsx"), "utf8");
    const source = readFileSync(path.join(process.cwd(), "lib/aup-free.ts"), "utf8");
    expect(AUP_FREE_HEADLINE).toBe("Get the free AUP Generator");
    expect(form).toContain("<h1");
    expect(form).toContain("{AUP_SEO_H1}");
    expect(form).toContain("{AUP_FREE_HEADLINE}");
    expect(form).toContain('name="email"');
    expect(form).toContain('name="firstName"');
    expect(form).toContain('name="company"');
    expect(form).toContain('type="submit"');
    expect(form.match(/type="submit"/g)).toHaveLength(1);
    expect(ready).toContain("{AUP_FREE_EMAIL_LEAD}");
    expect(ready).toContain("{AUP_FREE_SPAM}");
    expect(ready).toContain("{AUP_FREE_UPSELL}");
    expect(ready).toContain("href={BUILDER_PRO_GO}");
    expect(source).toContain("env[AUP_MAKE_ENV]");
    expect(source).not.toContain("hook.us");
    expect(source).not.toContain(webhook);
  });
});
