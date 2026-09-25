export type WebhookProduct = "flowchart_plus" | "builder_pro";

export type EntitlementWebhookCommand = {
  email: string;
  product: WebhookProduct;
  active: boolean;
};

export type WebhookParseResult =
  | { ok: true; command: EntitlementWebhookCommand }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function productFromToken(raw: string): WebhookProduct | null {
  const token = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (!token) return null;
  if (
    token === "builder-pro" ||
    token === "builder" ||
    token === "sop-builder-pro" ||
    (token.includes("builder") && token.includes("pro"))
  ) {
    return "builder_pro";
  }
  if (
    token === "flowchart-plus" ||
    token === "flowchart-studio" ||
    token === "flowchart" ||
    token.includes("flowchart")
  ) {
    return "flowchart_plus";
  }
  return null;
}

function emailFrom(body: Record<string, unknown>): string | null {
  const direct = firstString(body.email, body.customer_email, body.buyer_email, body.customerEmail);
  if (direct) return normalizeEmail(direct);
  const customer = asRecord(body.customer) || asRecord(body.buyer) || asRecord(body.contact);
  const nested = customer ? firstString(customer.email) : null;
  if (nested) return normalizeEmail(nested);
  const order = asRecord(body.order);
  const orderCustomer = order ? asRecord(order.customer) : null;
  const orderEmail = orderCustomer ? firstString(orderCustomer.email) : null;
  if (orderEmail) return normalizeEmail(orderEmail);
  return null;
}

function productFromBody(body: Record<string, unknown>): WebhookProduct | null {
  if (typeof body.product === "string") return productFromToken(body.product);
  const product = asRecord(body.product);
  const candidates = [
    body.product_slug,
    body.productSlug,
    body.slug,
    product?.slug,
    product?.sku,
    product?.name,
    body.product_name,
    body.productName,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = productFromToken(candidate);
      if (parsed) return parsed;
    }
  }
  return null;
}

function isRevoked(body: Record<string, unknown>): boolean {
  if (body.active === false || body.active === "false" || body.active === 0 || body.active === "0") {
    return true;
  }
  const blobs = [body.status, body.event, body.type, body.action].map((value) =>
    String(value ?? "").toLowerCase(),
  );
  return blobs.some((value) => /refund|cancel|revoke|chargeback|expired/.test(value));
}

export function parseEntitlementWebhook(body: unknown): WebhookParseResult {
  const rec = asRecord(body);
  if (!rec) return { ok: false, error: "Webhook body must be a JSON object." };
  const email = emailFrom(rec);
  if (!email) {
    return { ok: false, error: "A purchase email is required (email or customer.email)." };
  }
  const product = productFromBody(rec);
  if (!product) {
    return {
      ok: false,
      error:
        'Unknown product. Use "flowchart_plus" (SamCart slug flowchart-studio) or "builder_pro" (SamCart slug builder-pro).',
    };
  }
  return { ok: true, command: { email, product, active: !isRevoked(rec) } };
}
