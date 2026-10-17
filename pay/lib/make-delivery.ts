import type { Product } from "./catalog";
import type { EventStore } from "./event-store";
import { deliveryEmailContent, deliverySendKey, sendResendEmail } from "./fulfillment";
import { AUP_PRODUCT_ID, AUP_SAMCART_SLUG, ACCESS_LINK_ON_THE_WAY } from "./library";
import { captureCheckoutLead } from "./mailchimp";
import { stripeClient } from "./stripe-client";
import { stripeCredentials, type StripeMode } from "./stripe-mode";

export type StoredAccess = "missing" | "pending" | string;

const PREFERRED_URL_KEYS = ["url", "access_url", "link", "accessUrl", "download_url", "href"];

export function makeSendKey(email: string, eventId: string): string {
  return `${email.trim().toLowerCase()}|${eventId.trim()}|make`;
}

export function splitBuyerName(name: string): { first_name: string; last_name: string } {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return { first_name: "", last_name: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { first_name: trimmed, last_name: "" };
  return { first_name: trimmed.slice(0, space), last_name: trimmed.slice(space + 1) };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.startsWith("https://") ? trimmed : null;
}

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function createdAt(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return new Date(value * 1000).toISOString();
  return new Date().toISOString();
}

/** SamCart Notify URL shape, plus the flat fields Make can map without nesting. */
export function makeOrderPayload(input: {
  email: string;
  name: string;
  phone: string;
  orderId: string;
  totalCents: number;
  created: unknown;
  product: Product;
  eventId: string;
  free?: boolean;
}): Record<string, unknown> {
  const { first_name, last_name } = splitBuyerName(input.name);
  const slug = input.product.id === AUP_PRODUCT_ID ? AUP_SAMCART_SLUG : input.product.id.replace(/_/g, "-");
  const price = input.free ? "0.00" : dollars(input.product.priceCents);
  const customer = {
    email: input.email,
    first_name,
    last_name,
    phone: input.phone,
  };
  const product = {
    id: input.product.id,
    name: input.product.title,
    slug,
    price,
  };
  return {
    type: "Order",
    customer,
    order: {
      id: input.orderId,
      total: input.free ? "0.00" : dollars(input.totalCents),
      created_at: createdAt(input.created),
    },
    products: [product],
    email: input.email,
    first_name,
    last_name,
    order_id: input.orderId,
    product_slug: slug,
    stripe_event_id: input.eventId,
    source: "pay.sopmojo.com",
    ...(input.free ? { free: true } : {}),
  };
}

function findPreferredUrl(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPreferredUrl(item);
      if (found) return found;
    }
    return null;
  }
  const row = asRecord(value);
  if (!row) return null;
  for (const key of PREFERRED_URL_KEYS) {
    const direct = httpsUrl(row[key]);
    if (direct) return direct;
  }
  for (const entry of Object.values(row)) {
    const nested = findPreferredUrl(entry);
    if (nested) return nested;
  }
  return null;
}

function findAnyHttps(value: unknown): string | null {
  const direct = httpsUrl(value);
  if (direct) return direct;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAnyHttps(item);
      if (found) return found;
    }
    return null;
  }
  const row = asRecord(value);
  if (!row) return null;
  for (const entry of Object.values(row)) {
    const found = findAnyHttps(entry);
    if (found) return found;
  }
  return null;
}

/** First https URL in a JSON body. Keys named url, access_url, or link win. */
export function urlFromWebhookJson(value: unknown): string | null {
  return findPreferredUrl(value) ?? findAnyHttps(value);
}

/** Types and key names only. URL strings become the word "url". */
export function webhookBodyShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => webhookBodyShape(item));
  const row = asRecord(value);
  if (row) {
    const shape: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(row)) {
      if (typeof entry === "string") shape[key] = httpsUrl(entry) ? "url" : "string";
      else if (typeof entry === "number") shape[key] = "number";
      else if (typeof entry === "boolean") shape[key] = "boolean";
      else if (entry == null) shape[key] = "null";
      else shape[key] = webhookBodyShape(entry);
    }
    return shape;
  }
  if (typeof value === "string") return httpsUrl(value) ? "url" : "string";
  return typeof value;
}

export function pendingAccessEmail(title: string): { subject: string; text: string; html: string } {
  const name = title.trim() || "Your purchase";
  return {
    subject: `${name} is on its way`,
    text: [ACCESS_LINK_ON_THE_WAY, "", "Check your junk and spam folder too."].join("\n"),
    html: `<p>${ACCESS_LINK_ON_THE_WAY}</p><p>Check your junk and spam folder too.</p>`,
  };
}

function webhookUrl(env: NodeJS.ProcessEnv, envVar: string): string {
  if (!/^[A-Z][A-Z0-9_]*WEBHOOK_URL$/.test(envVar)) {
    throw new Error("Delivery webhook env var name is invalid.");
  }
  const url = env[envVar]?.trim() ?? "";
  if (!url) throw new Error(`Set ${envVar} so the buyer access link can be created.`);
  if (!/^https:\/\//i.test(url)) throw new Error(`${envVar} must be an https URL.`);
  return url;
}

export async function saveStripeOrderAccess(input: {
  orderId: string;
  accessUrl: string | null;
  env: NodeJS.ProcessEnv;
  mode: StripeMode;
}): Promise<void> {
  const creds = stripeCredentials(input.env, input.mode);
  if (!creds.secretKey) throw new Error("Stripe secret is not set, so the access link cannot be stored on the order.");
  const stripe = stripeClient(creds.secretKey);
  try {
    await stripe.checkout.sessions.update(input.orderId, {
      metadata: {
        access_url: input.accessUrl ?? "",
        access_pending: input.accessUrl ? "0" : "1",
      },
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? String((error as { statusCode?: unknown }).statusCode ?? "")
        : "";
    console.info(JSON.stringify({ source: "make_webhook", order: "store_failed", status }));
    throw new Error("Could not store the access link on the order.");
  }
}

export async function loadStripeOrderAccess(input: {
  orderId: string;
  env: NodeJS.ProcessEnv;
  mode: StripeMode;
}): Promise<StoredAccess> {
  const creds = stripeCredentials(input.env, input.mode);
  if (!creds.secretKey) return "missing";
  const session = await stripeClient(creds.secretKey).checkout.sessions.retrieve(input.orderId);
  return accessFromMetadata(session.metadata ?? null);
}

export function accessFromMetadata(metadata: Record<string, string> | null): StoredAccess {
  if (!metadata) return "missing";
  const url = httpsUrl(metadata.access_url);
  if (url) return url;
  if (metadata.access_pending === "1" || metadata.access_pending === "0") return "pending";
  return "missing";
}

function sessionFields(session: Record<string, unknown>, email: string, product: Product) {
  const details = asRecord(session.customer_details);
  const name = typeof details?.name === "string" ? details.name : "";
  const phone = typeof details?.phone === "string" ? details.phone : "";
  const totalCents = typeof session.amount_total === "number" ? session.amount_total : product.priceCents;
  const orderId = typeof session.id === "string" ? session.id.trim() : "";
  return { name, phone, totalCents, orderId, email };
}

/**
 * Claim the Stripe event, POST the order to Make, then email the buyer.
 * A second delivery of the same event does not POST again.
 */
export async function deliverMakeWebhook(input: {
  email: string;
  eventId: string;
  product: Product;
  session: Record<string, unknown>;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  store: EventStore;
  stripeMode: StripeMode;
  saveOrderAccess?: (order: { orderId: string; accessUrl: string | null }) => Promise<void>;
  loadOrderAccess?: (orderId: string) => Promise<StoredAccess>;
}): Promise<"sent" | "skipped"> {
  const delivery = input.product.delivery;
  if (input.product.billing !== "once" || delivery?.kind !== "make_webhook") return "skipped";
  const email = input.email.trim().toLowerCase();
  const fields = sessionFields(input.session, email, input.product);
  if (!fields.orderId) throw new Error("Checkout session id is required.");
  const save =
    input.saveOrderAccess ??
    ((order: { orderId: string; accessUrl: string | null }) =>
      saveStripeOrderAccess({ ...order, env: input.env, mode: input.stripeMode }));
  const load =
    input.loadOrderAccess ??
    ((orderId: string) => loadStripeOrderAccess({ orderId, env: input.env, mode: input.stripeMode }));

  const makeKey = makeSendKey(email, input.eventId);
  const claimed = await input.store.claimCredentialSend(makeKey);
  let accessUrl: string | null = null;
  if (claimed) {
    try {
      const endpoint = webhookUrl(input.env, delivery.envVar);
      const response = await input.fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          makeOrderPayload({
            email,
            name: fields.name,
            phone: fields.phone,
            orderId: fields.orderId,
            totalCents: fields.totalCents,
            created: input.session.created,
            product: input.product,
            eventId: input.eventId,
          }),
        ),
      });
      const text = await response.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          parsed = null;
        }
      }
      console.info(
        JSON.stringify({
          source: "make_webhook",
          status: response.status,
          shape: parsed == null ? (text ? "text" : "empty") : webhookBodyShape(parsed),
        }),
      );
      if (!response.ok) throw new Error(`Make webhook returned ${response.status}.`);
      accessUrl = parsed == null ? null : urlFromWebhookJson(parsed);
      await save({ orderId: fields.orderId, accessUrl });
    } catch (error) {
      await input.store.releaseCredentialSend(makeKey);
      throw error;
    }
  } else {
    const stored = await load(fields.orderId);
    if (stored === "missing") throw new Error("Access link is still being stored.");
    accessUrl = stored === "pending" ? null : stored;
  }

  const emailKey = deliverySendKey(email, input.eventId);
  const emailClaimed = await input.store.claimCredentialSend(emailKey);
  if (!emailClaimed) return "skipped";
  try {
    const content = accessUrl
      ? deliveryEmailContent({ title: input.product.title, url: accessUrl, label: delivery.label })
      : pendingAccessEmail(input.product.title);
    const sent = await sendResendEmail({
      email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    if (!sent) throw new Error("Set RESEND_API_KEY so the buyer receives the access email.");
    await captureCheckoutLead({
      email,
      products: [input.product.id],
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    return "sent";
  } catch (error) {
    await input.store.releaseCredentialSend(emailKey);
    throw error;
  }
}
