import type Stripe from "stripe";
import { checkoutSessionParams, isTaxConfigurationError } from "./checkout-params";
import type { CatalogSnapshot, Product } from "./catalog";
import type { CatalogStore } from "./catalog-store";
import { captureCheckoutLead } from "./mailchimp";
import { stripeClient } from "./stripe-client";
import { stripeCredentials } from "./stripe-mode";

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

export async function openCheckoutSession(input: {
  product: Product;
  email: string;
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
        ? "Live mode is on, but the live Stripe keys are missing. Switch back to test or add the live keys."
        : "Add the Stripe test secret and publishable keys to take a test payment.",
    );
  }
  const stripe = stripeClient(creds.secretKey);
  const customerId = await customerForEmail(stripe, input.email);
  const base = {
    product: input.product,
    email: input.email,
    customerId,
    annual: input.annual,
    bump: input.bump,
    returnOrigin: input.returnOrigin,
  };
  let taxApplied = true;
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(checkoutSessionParams({ ...base, tax: true }));
  } catch (error) {
    if (!isTaxConfigurationError(error)) throw error;
    taxApplied = false;
    const message = error instanceof Error ? error.message : "Stripe Tax is not active on this account.";
    session = await stripe.checkout.sessions.create(checkoutSessionParams({ ...base, tax: false }));
    if (input.snapshot.settings.taxNotice !== message) {
      await input.store
        .write({ ...input.snapshot, settings: { ...input.snapshot.settings, taxNotice: message } })
        .catch(() => undefined);
    }
  }
  if (taxApplied && input.snapshot.settings.taxNotice) {
    await input.store
      .write({ ...input.snapshot, settings: { ...input.snapshot.settings, taxNotice: null } })
      .catch(() => undefined);
  }
  if (!session.client_secret) throw new Error("Stripe did not return a checkout client secret.");
  await captureCheckoutLead({ email: input.email, env, fetchImpl: input.fetchImpl });
  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
    taxApplied,
    publishableKey: creds.publishableKey,
    mode: creds.mode,
  };
}
