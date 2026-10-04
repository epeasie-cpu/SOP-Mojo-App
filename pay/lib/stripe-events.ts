import { isEntitlementProduct, type EntitlementProduct } from "./catalog";

export type IncomingStripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

export type StripeAction =
  | { kind: "grant"; email: string; products: EntitlementProduct[]; allowCredentials: boolean }
  | { kind: "revoke"; email: string; products: EntitlementProduct[] }
  | { kind: "decline"; email: string | null }
  | { kind: "ignore" };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asMetadata(value: unknown): Record<string, string> {
  const row = asRecord(value);
  if (!row) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(row)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function productsFromMetadata(metadata: Record<string, string>): EntitlementProduct[] {
  const raw = metadata.entitlements || metadata.entitlement_product || metadata.product || "";
  const found: EntitlementProduct[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const token = part.trim();
    if (isEntitlementProduct(token) && !found.includes(token)) found.push(token);
  }
  return found;
}

export function stripeObjectMetadata(object: Record<string, unknown>): Record<string, string> {
  const direct = asMetadata(object.metadata);
  const parent = asRecord(object.parent);
  const nested = asMetadata(asRecord(parent?.subscription_details)?.metadata);
  const legacy = asMetadata(asRecord(object.subscription_details)?.metadata);
  const lines = asRecord(object.lines);
  const data = Array.isArray(lines?.data) ? lines.data : [];
  let lineMeta: Record<string, string> = {};
  for (const line of data) {
    lineMeta = { ...asMetadata(asRecord(line)?.metadata), ...lineMeta };
  }
  return { ...lineMeta, ...legacy, ...nested, ...direct };
}

function emailFromObject(object: Record<string, unknown>, metadata: Record<string, string>): string | null {
  const details = asRecord(object.customer_details);
  const billing = asRecord(object.billing_details);
  return (
    normalizeEmail(metadata.email) ||
    normalizeEmail(object.customer_email) ||
    normalizeEmail(details?.email) ||
    normalizeEmail(object.receipt_email) ||
    normalizeEmail(billing?.email)
  );
}

export function decideAction(event: IncomingStripeEvent): StripeAction {
  const object = event.data?.object ?? {};
  const metadata = stripeObjectMetadata(object);
  const email = emailFromObject(object, metadata);
  const products = productsFromMetadata(metadata);

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const paymentStatus = String(object.payment_status ?? "");
    if (paymentStatus && paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
      return { kind: "ignore" };
    }
    if (!email || products.length === 0) return { kind: "ignore" };
    return { kind: "grant", email, products, allowCredentials: true };
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    const reason = String(object.billing_reason ?? "");
    if (!email || products.length === 0) return { kind: "ignore" };
    const renewal = reason === "subscription_cycle" || reason === "subscription_update";
    return { kind: "grant", email, products, allowCredentials: !renewal };
  }

  if (
    event.type === "customer.subscription.deleted" ||
    (event.type === "customer.subscription.updated" &&
      ["canceled", "unpaid", "incomplete_expired"].includes(String(object.status ?? "")))
  ) {
    if (!email || products.length === 0) return { kind: "ignore" };
    return { kind: "revoke", email, products };
  }

  if (event.type === "charge.refunded") {
    const refunded = Number(object.amount_refunded ?? 0);
    if (!refunded) return { kind: "ignore" };
    if (!email || products.length === 0) return { kind: "ignore" };
    return { kind: "revoke", email, products };
  }

  if (
    event.type === "payment_intent.payment_failed" ||
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "invoice.payment_failed"
  ) {
    return { kind: "decline", email };
  }

  return { kind: "ignore" };
}
