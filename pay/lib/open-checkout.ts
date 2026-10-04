import type Stripe from "stripe";
import { checkoutLineItems, checkoutSessionParams, sessionMetadata } from "./checkout-params";
import type { CatalogSnapshot, Product } from "./catalog";
import type { CatalogStore } from "./catalog-store";
import { captureCheckoutLead } from "./mailchimp";
import { stripeClient } from "./stripe-client";
import { stripeCredentials } from "./stripe-mode";
import { automaticTaxEnabled } from "./tax";

export function normalizeBuyerEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function findProduct(
  store: CatalogStore,
  id: string,
): Promise<{ snapshot: CatalogSnapshot; product: Product | null }> {
  const snapshot = await store.read();
  const product = snapshot.products.find((item) => item.id === id) ?? null;
  return { snapshot, product };
}

async function customerForEmail(stripe: Stripe, email: string): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const created = await stripe.customers.create({ email });
  return created.id;
}

function stripeId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

export async function openCheckoutSession(input: {
  product: Product;
  email?: string | null;
  annual: boolean;
  bump: boolean;
  returnOrigin: string;
  snapshot: CatalogSnapshot;
  store: CatalogStore;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ clientSecret: string; sessionId: string; taxApplied: boolean; publishableKey: string; mode: "test" | "live" }> {
  const env = input.env ?? process.env;
  const creds = stripeCredentials(env, input.snapshot.settings.stripeMode);
  if (!creds.secretKey || !creds.publishableKey) {
    throw new Error(
      creds.mode === "live"
        ? "Live mode is selected, but the live Stripe keys are not set."
        : "Add the Stripe test secret and publishable keys to take a test payment.",
    );
  }
  const email = input.email ? normalizeBuyerEmail(input.email) : null;
  if (input.email && !email) throw new Error("Enter a valid email to continue.");
  const stripe = stripeClient(creds.secretKey);
  const customerId = email ? await customerForEmail(stripe, email) : null;
  const taxApplied = automaticTaxEnabled();
  const session = await stripe.checkout.sessions.create(
    checkoutSessionParams({
      product: input.product,
      email,
      customerId,
      annual: input.annual,
      bump: input.bump,
      returnOrigin: input.returnOrigin,
      tax: taxApplied,
    }),
  );
  if (!session.client_secret) throw new Error("Stripe did not return a checkout client secret.");
  if (email) await captureCheckoutLead({ email, env, fetchImpl: input.fetchImpl });
  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
    taxApplied,
    publishableKey: creds.publishableKey,
    mode: creds.mode,
  };
}

export async function updateCheckoutSession(input: {
  sessionId: string;
  product: Product;
  email?: string | null;
  annual: boolean;
  bump: boolean;
  lineItems: boolean;
  snapshot: CatalogSnapshot;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const env = input.env ?? process.env;
  const creds = stripeCredentials(env, input.snapshot.settings.stripeMode);
  if (!creds.secretKey) throw new Error("Add the Stripe secret key to take a test payment.");
  const email = input.email ? normalizeBuyerEmail(input.email) : null;
  if (input.email && !email) throw new Error("Enter a valid email to continue.");
  const stripe = stripeClient(creds.secretKey);
  const existing = await stripe.checkout.sessions.retrieve(input.sessionId);
  if (existing.metadata?.product_id !== input.product.id) {
    throw new Error("This checkout does not match that product.");
  }
  if (existing.status !== "open") throw new Error("This checkout is no longer open.");
  const metadata = sessionMetadata(input.product, { email, annual: input.annual, bump: input.bump });
  const params: Stripe.Checkout.SessionUpdateParams = { metadata };
  if (input.lineItems) {
    params.line_items = checkoutLineItems(input.product, {
      email,
      annual: input.annual,
      bump: input.bump,
    }) as Stripe.Checkout.SessionUpdateParams.LineItem[];
  }
  const session = await stripe.checkout.sessions.update(input.sessionId, params);
  if (email && session.mode === "payment") {
    const paymentIntentId = stripeId(session.payment_intent);
    if (paymentIntentId) {
      await stripe.paymentIntents.update(paymentIntentId, { receipt_email: email, metadata });
    }
  }
  if (email && session.mode === "subscription") {
    const customerId = stripeId(session.customer) ?? stripeId(existing.customer);
    if (customerId) await stripe.customers.update(customerId, { email });
  }
  if (email) await captureCheckoutLead({ email, env, fetchImpl: input.fetchImpl });
}
