import { withCanSpam } from "./can-spam";
import { createEventStore, type EventStore } from "./event-store";
import { sendResendEmail } from "./fulfillment";
import { AUP_MAKE_ENV, FREE_AUP_PATH, libraryProducts } from "./library";
import { makeOrderPayload, urlFromWebhookJson, webhookBodyShape } from "./make-delivery";
import { captureFreeAupLead } from "./mailchimp";
import { normalizeBuyerEmail } from "./open-checkout";

export const FREE_AUP_READY_PATH = "/free/aup-generator/ready";

export const AUP_FREE_HEADLINE = "Get the free AUP Generator";

export const AUP_FREE_EMAIL_LEAD = "Your Acceptable Use Policy Generator access link is on its way";

export const AUP_FREE_SPAM = "Check your junk and spam folder too.";

export const AUP_FREE_UPSELL = "Turn your policies into SOPs your team actually follows. Builder Pro $39/mo";

export const BUILDER_PRO_GO = "https://pay.sopmojo.com/go/builder_pro";

export const FREE_AUP_RATE_LIMIT = 5;

export const FREE_AUP_RATE_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

export function resetFreeAupRateLimit(): void {
  hits.clear();
}

export function clientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  const real = headerList.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

/** Count a submit. True when this IP is over the limit. */
export function freeAupRateLimited(ip: string, now = Date.now()): boolean {
  const key = ip.trim() || "unknown";
  const recent = (hits.get(key) ?? []).filter((at) => now - at < FREE_AUP_RATE_WINDOW_MS);
  if (recent.length >= FREE_AUP_RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function freeAupClaimKey(email: string): string {
  return `${email.trim().toLowerCase()}|aup-free`;
}

export function freeAupEmailClaimKey(email: string): string {
  return `${email.trim().toLowerCase()}|aup-free|email`;
}

export type FreeAupResult = { ok: true } | { ok: false; code: "email" | "rate" | "send" };

function cleanName(value: string): string {
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function aupWebhookUrl(env: NodeJS.ProcessEnv): string {
  const url = env[AUP_MAKE_ENV]?.trim() ?? "";
  if (!url) throw new Error(`Set ${AUP_MAKE_ENV} so the buyer access link can be created.`);
  if (!/^https:\/\//i.test(url)) throw new Error(`${AUP_MAKE_ENV} must be an https URL.`);
  return url;
}

export function freeAupEmail(
  accessUrl: string | null,
  options?: { to?: string; env?: NodeJS.ProcessEnv },
): { subject: string; text: string; html: string } {
  const link = accessUrl?.trim() ?? "";
  const text = [AUP_FREE_EMAIL_LEAD, ...(link ? ["", link] : []), "", AUP_FREE_UPSELL, BUILDER_PRO_GO].join("\n");
  const html = [
    `<p>${escapeHtml(AUP_FREE_EMAIL_LEAD)}</p>`,
    link ? `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` : "",
    `<p><a href="${BUILDER_PRO_GO}">${escapeHtml(AUP_FREE_UPSELL)}</a></p>`,
  ].join("");
  return withCanSpam(
    { subject: AUP_FREE_EMAIL_LEAD, text, html },
    { to: options?.to, resource: "Acceptable Use Policy Generator", reason: "requested", marketing: true, env: options?.env },
  );
}

export function freeAupErrorMessage(code: string | undefined): string | null {
  if (code === "email") return "Enter a valid email.";
  if (code === "rate") return "Too many requests. Try again in a few minutes.";
  if (code === "send") return "We could not send your access link. Try again in a minute.";
  return null;
}

/**
 * Honeypot, rate limit, Mailchimp `aup-free`, one Make post per email, then Resend.
 * A filled honeypot looks successful and calls nothing.
 */
export async function submitFreeAup(input: {
  email: string;
  firstName: string;
  company: string;
  ip: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  store?: EventStore;
  now?: number;
  orderId?: string;
}): Promise<FreeAupResult> {
  if (input.company.trim()) return { ok: true };
  const email = normalizeBuyerEmail(input.email);
  if (!email) return { ok: false, code: "email" };
  if (freeAupRateLimited(input.ip, input.now ?? Date.now())) return { ok: false, code: "rate" };

  let endpoint: string;
  try {
    endpoint = aupWebhookUrl(input.env);
  } catch {
    return { ok: false, code: "send" };
  }

  const firstName = cleanName(input.firstName);
  const fetchImpl = input.fetchImpl ?? fetch;
  const store = input.store ?? createEventStore(input.env);
  await captureFreeAupLead({ email, firstName, env: input.env, fetchImpl });

  const makeKey = freeAupClaimKey(email);
  const claimed = await store.claimCredentialSend(makeKey);
  let accessUrl: string | null = null;
  if (claimed) {
    const orderId = input.orderId?.trim() || `free_${crypto.randomUUID()}`;
    try {
      const product = libraryProducts().find((item) => item.id === "aup_generator");
      if (!product) throw new Error("AUP product is missing.");
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          makeOrderPayload({
            email,
            name: firstName,
            phone: "",
            orderId,
            totalCents: 0,
            created: Math.floor((input.now ?? Date.now()) / 1000),
            product,
            eventId: orderId,
            free: true,
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
          source: "aup_free",
          status: response.status,
          shape: parsed == null ? (text ? "text" : "empty") : webhookBodyShape(parsed),
        }),
      );
      if (!response.ok) throw new Error(`Make webhook returned ${response.status}.`);
      accessUrl = parsed == null ? null : urlFromWebhookJson(parsed);
    } catch {
      await store.releaseCredentialSend(makeKey);
      return { ok: false, code: "send" };
    }
  }

  const emailKey = freeAupEmailClaimKey(email);
  const emailClaimed = await store.claimCredentialSend(emailKey);
  if (!emailClaimed) return { ok: true };
  try {
    const content = freeAupEmail(accessUrl, { to: email, env: input.env });
    const sent = await sendResendEmail({
      email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      env: input.env,
      fetchImpl,
      marketing: true,
      explicitRequest: true,
      store,
    });
    if (!sent) throw new Error("Set RESEND_API_KEY so the buyer receives the access email.");
    return { ok: true };
  } catch {
    await store.releaseCredentialSend(emailKey);
    return { ok: false, code: "send" };
  }
}

export { FREE_AUP_PATH };
