import type { IncomingStripeEvent } from "./stripe-events";
import { productsFromMetadata, stripeObjectMetadata } from "./stripe-events";
import { stripeClient } from "./stripe-client";
import { stripeCredentials } from "./stripe-mode";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stripeId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  const row = asRecord(value);
  return typeof row?.id === "string" && row.id ? row.id : null;
}

/**
 * Copy entitlements from the first related object that names products.
 * A later object cannot add a second product.
 */
export function assignRefundEntitlements(
  object: Record<string, unknown>,
  sources: Record<string, unknown>[],
): string[] {
  const current = stripeObjectMetadata(object);
  const already = productsFromMetadata(current);
  if (already.length > 0) return already;
  for (const source of sources) {
    const meta = stripeObjectMetadata(source);
    const products = productsFromMetadata(meta);
    if (products.length === 0) continue;
    const email = current.email || meta.email;
    object.metadata = {
      ...current,
      entitlements: products.join(","),
      ...(email ? { email } : {}),
    };
    return products;
  }
  return [];
}

function subscriptionIdFromInvoice(invoice: Record<string, unknown>): string | null {
  const direct = stripeId(invoice.subscription);
  if (direct) return direct;
  const parent = asRecord(invoice.parent);
  const details = asRecord(parent?.subscription_details);
  return stripeId(details?.subscription);
}

/** Fill charge.refunded metadata from that charge's payment, not from the customer's other products. */
export async function hydrateRefundPurchase(
  event: IncomingStripeEvent,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (event.type !== "charge.refunded") return;
  const object = event.data?.object;
  if (!object) return;
  if (productsFromMetadata(stripeObjectMetadata(object)).length > 0) return;
  const creds = stripeCredentials(env, object.livemode === true ? "live" : "test");
  if (!creds.secretKey) {
    console.error("charge.refunded is missing entitlement metadata and the Stripe secret key for this mode.");
    return;
  }
  const stripe = stripeClient(creds.secretKey);
  const sources: Record<string, unknown>[] = [];
  const paymentIntentId = stripeId(object.payment_intent);
  if (paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    sources.push(paymentIntent as unknown as Record<string, unknown>);
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
    sources.push(...(sessions.data as unknown as Record<string, unknown>[]));
    const payments = await stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentIntentId },
      limit: 1,
    });
    const invoiceId = stripeId(payments.data[0]?.invoice);
    if (invoiceId) {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const invoiceRecord = invoice as unknown as Record<string, unknown>;
      sources.push(invoiceRecord);
      if (productsFromMetadata(stripeObjectMetadata(invoiceRecord)).length === 0) {
        const subscriptionId = subscriptionIdFromInvoice(invoiceRecord);
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          sources.push(subscription as unknown as Record<string, unknown>);
        }
      }
    }
  }
  const legacyInvoiceId = stripeId(object.invoice);
  if (legacyInvoiceId && !sources.some((source) => source.id === legacyInvoiceId)) {
    const invoice = await stripe.invoices.retrieve(legacyInvoiceId);
    sources.push(invoice as unknown as Record<string, unknown>);
  }
  assignRefundEntitlements(object, sources);
}
