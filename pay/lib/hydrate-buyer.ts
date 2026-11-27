import type { IncomingStripeEvent } from "./stripe-events";
import { normalizeEmail } from "./stripe-events";
import { stripeClient } from "./stripe-client";
import { stripeCredentials } from "./stripe-mode";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringMetadata(value: unknown): Record<string, string> {
  const row = asRecord(value);
  if (!row) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(row)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

function customerIdOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  const row = asRecord(value);
  return typeof row?.id === "string" && row.id ? row.id : null;
}

/** Fill metadata.email from the Stripe customer when the event itself has no buyer email. */
export async function hydrateBuyerEmail(
  event: IncomingStripeEvent,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const object = event.data?.object;
  if (!object) return;
  const metadata = stringMetadata(object.metadata);
  const details = asRecord(object.customer_details);
  const billing = asRecord(object.billing_details);
  const known =
    normalizeEmail(metadata.email) ||
    normalizeEmail(object.customer_email) ||
    normalizeEmail(details?.email) ||
    normalizeEmail(object.receipt_email) ||
    normalizeEmail(billing?.email);
  if (known) return;
  const customerId = customerIdOf(object.customer);
  if (!customerId) return;
  const creds = stripeCredentials(env, object.livemode === true ? "live" : "test");
  if (!creds.secretKey) return;
  const customer = await stripeClient(creds.secretKey).customers.retrieve(customerId);
  if (customer.deleted) return;
  const email = normalizeEmail(customer.email);
  if (!email) return;
  object.metadata = { ...metadata, email };
}
