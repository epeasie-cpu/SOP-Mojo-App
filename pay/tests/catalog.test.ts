import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { accessCodeMatches, readSession, signSession } from "@/lib/admin-session";
import { parseCatalog } from "@/lib/catalog";
import { checkoutSessionParams } from "@/lib/checkout-params";
import { automaticTaxEnabled } from "@/lib/tax";
import { embedSnippet, stableUrl } from "@/lib/links";
import { CHECKOUT_LEAD_TAG, captureCheckoutLead } from "@/lib/mailchimp";
import { quoteProduct } from "@/lib/pricing";
import { seedCatalog, seedProducts } from "@/lib/seed";
import { constructStripeEvent } from "@/lib/stripe-client";

describe("catalog, price, and checkout session", () => {
  it("seeds Flowchart Plus at $19 and Builder Pro monthly plus $390 annual", () => {
    const [flowchart, builder] = seedProducts();
    expect(flowchart).toMatchObject({
      id: "flowchart_plus",
      priceCents: 1900,
      billing: "once",
      entitlementProduct: "flowchart_plus",
      presentation: "page",
    });
    expect(builder).toMatchObject({
      id: "builder_pro",
      priceCents: 3900,
      billing: "month",
      entitlementProduct: "builder_pro",
      presentation: "panel",
    });
    expect(builder?.annual?.priceCents).toBe(39000);
    const monthly = quoteProduct(builder!, { annual: false, bump: false });
    expect(monthly.billingLine).toBe("billed monthly until you cancel");
    const annual = quoteProduct(builder!, { annual: true, bump: false });
    expect(annual.interval).toBe("year");
    expect(annual.amountCents).toBe(39000);
    expect(annual.billingLine).toBe("billed annually until you cancel");
    expect(parseCatalog(seedCatalog()).products).toHaveLength(2);
  });

  it("adds one optional bump to the same payment and leaves the annual price alone", () => {
    const builder = seedProducts()[1]!;
    const bumped = {
      ...builder,
      orderBump: {
        title: "Flowchart Plus",
        description: "One-time export unlock.",
        priceCents: 1900,
        entitlementProduct: "flowchart_plus" as const,
      },
    };
    const quote = quoteProduct(bumped, { annual: true, bump: true });
    expect(builder.priceCents).toBe(3900);
    expect(builder.annual?.priceCents).toBe(39000);
    expect(quote.amountCents).toBe(40900);
    expect(quote.interval).toBe("year");
    expect(quote.entitlementProducts).toEqual(["builder_pro", "flowchart_plus"]);
    const params = checkoutSessionParams({
      product: bumped,
      email: "buyer@example.com",
      annual: true,
      bump: true,
      returnOrigin: "https://pay.sopmojo.com",
      tax: false,
    });
    expect(params.line_items).toHaveLength(2);
    expect(params.metadata?.entitlements).toBe("builder_pro,flowchart_plus");
    expect(params.metadata?.bump).toBe("1");
    expect(quoteProduct(builder, { annual: false, bump: false }).amountCents).toBe(3900);
  });

  it("uses Checkout Sessions elements mode so the page owns layout and Stripe charges the card", () => {
    const builder = seedProducts()[1]!;
    const params = checkoutSessionParams({
      product: builder,
      email: "buyer@example.com",
      customerId: "cus_123",
      annual: true,
      bump: false,
      returnOrigin: "https://pay.sopmojo.com",
      tax: automaticTaxEnabled(),
    });
    expect(automaticTaxEnabled()).toBe(false);
    expect(params.ui_mode).toBe("elements");
    expect(params.mode).toBe("subscription");
    expect(params.customer).toBe("cus_123");
    expect(params.automatic_tax).toEqual({ enabled: false });
    expect(params.billing_address_collection).toBeUndefined();
    expect(params.subscription_data?.metadata?.entitlements).toBe("builder_pro");
    const flowchart = seedProducts()[0]!;
    const once = checkoutSessionParams({
      product: flowchart,
      email: "buyer@example.com",
      customerId: "cus_123",
      annual: false,
      bump: false,
      returnOrigin: "https://pay.sopmojo.com",
      tax: false,
    });
    expect(once.mode).toBe("payment");
    expect(once.customer_creation).toBeUndefined();
    expect(once.payment_intent_data?.receipt_email).toBe("buyer@example.com");
    expect(once.invoice_creation).toEqual({ enabled: true });
  });

  it("creates the card session before an email exists", () => {
    const flowchart = seedProducts()[0]!;
    const params = checkoutSessionParams({
      product: flowchart,
      annual: false,
      bump: false,
      returnOrigin: "https://pay.sopmojo.com",
      tax: false,
    });
    expect(params.ui_mode).toBe("elements");
    expect(params.customer).toBeUndefined();
    expect(params.customer_email).toBeUndefined();
    expect(params.customer_creation).toBe("always");
    expect(params.payment_intent_data?.receipt_email).toBeUndefined();
    expect(params.metadata?.email).toBeUndefined();
    expect(params.metadata?.entitlements).toBe("flowchart_plus");
    const builder = seedProducts()[1]!;
    const subscription = checkoutSessionParams({
      product: builder,
      annual: true,
      bump: false,
      returnOrigin: "https://pay.sopmojo.com",
      tax: false,
    });
    expect(subscription.mode).toBe("subscription");
    expect(subscription.customer).toBeUndefined();
    expect(subscription.customer_creation).toBeUndefined();
    expect(subscription.metadata?.email).toBeUndefined();
    expect(subscription.subscription_data?.metadata?.entitlements).toBe("builder_pro");
    expect(subscription.subscription_data?.metadata?.annual).toBe("1");
  });

  it("publishes the stable Framer link on pay.sopmojo.com", () => {
    expect(stableUrl("flowchart_plus")).toBe("https://pay.sopmojo.com/go/flowchart_plus");
    expect(embedSnippet("builder_pro", "Builder Pro")).toContain('src="https://pay.sopmojo.com/embed.js"');
    expect(embedSnippet("builder_pro", "Builder Pro")).toContain('href="https://pay.sopmojo.com/go/builder_pro"');
  });

  it("keeps the catalog behind the admin allowlist", () => {
    const env = { ADMIN_ACCESS_CODE: "correct horse" } as unknown as NodeJS.ProcessEnv;
    expect(accessCodeMatches("nope", env)).toBe(false);
    expect(accessCodeMatches("correct horse", env)).toBe(true);
    const token = signSession("ryan@sopmojo.com", env);
    expect(readSession(token, env)?.email).toBe("ryan@sopmojo.com");
    expect(readSession(token, { ...env, ADMIN_EMAILS: "other@sopmojo.com" })).toBeNull();
  });

  it("captures the buyer on the existing Mailchimp audience and skips when unconfigured", async () => {
    const skipped = await captureCheckoutLead({
      email: "buyer@example.com",
      env: {} as unknown as NodeJS.ProcessEnv,
      fetchImpl: async () => {
        throw new Error("should not be called");
      },
    });
    expect(skipped).toEqual({ ok: true, skipped: true, reason: "unconfigured" });
    expect(CHECKOUT_LEAD_TAG).toBe("checkout");

    const calls: { url: string; method: string; body: unknown }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({
        url: String(input),
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return new Response("{}", { status: 200 });
    };
    const tagged = await captureCheckoutLead({
      email: "Buyer@Example.com",
      products: ["builder_pro", "flowchart_plus", "unknown_product", "builder_pro"],
      env: { MAILCHIMP_API_KEY: "key-us21", MAILCHIMP_AUDIENCE_ID: "aud" } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    });
    expect(tagged).toEqual({ ok: true });
    const tagPosts = calls.filter((call) => call.method === "POST" && call.url.endsWith("/tags"));
    expect(tagPosts).toHaveLength(1);
    expect(tagPosts[0]?.body).toEqual({
      tags: [
        { name: "checkout", status: "active" },
        { name: "builder-pro", status: "active" },
        { name: "flowchart-plus", status: "active" },
      ],
    });
  });

  it("verifies the Stripe webhook signature", () => {
    const payload = JSON.stringify({
      id: "evt_sig",
      object: "event",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_1" } },
    });
    const secret = "whsec_test_secret";
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = constructStripeEvent(payload, header, { STRIPE_WEBHOOK_SECRET: secret } as unknown as NodeJS.ProcessEnv);
    expect(event.id).toBe("evt_sig");
    expect(() =>
      constructStripeEvent(payload, header, { STRIPE_WEBHOOK_SECRET: "whsec_other" } as unknown as NodeJS.ProcessEnv),
    ).toThrow();
  });
});
