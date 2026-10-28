import { logResendSent } from "./delivery-log";
import { createEventStore, type EventStore } from "./event-store";
import { sendResendEmail } from "./fulfillment";
import { isLeadQaEmail } from "./lead-qa";
import { captureCptKitLead } from "./mailchimp";
import { normalizeBuyerEmail } from "./open-checkout";
import { CPT_KIT_BUILDER_PRO_GO, CPT_KIT_DISCLAIMER, CPT_KIT_UPSELL } from "./cpt-kit-page";
import { QMS_SPAM } from "./qms-check";

export const CPT_KIT_URL_ENV = "CPT_KIT_URL";

export const CPT_KIT_EMAIL_LEAD = "Your 2027 SLP CPT Code Transition Kit";

export const CPT_KIT_RATE_LIMIT = 5;

export const CPT_KIT_RATE_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

export function resetCptKitRateLimit(): void {
  hits.clear();
}

export function cptKitRateLimited(ip: string, now = Date.now()): boolean {
  const key = ip.trim() || "unknown";
  const recent = (hits.get(key) ?? []).filter((at) => now - at < CPT_KIT_RATE_WINDOW_MS);
  if (recent.length >= CPT_KIT_RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function cptKitClaimKey(email: string): string {
  return `${email.trim().toLowerCase()}|cpt-kit`;
}

/** https only. http and empty values are refused. */
export function cptKitUrl(env: NodeJS.ProcessEnv): string | null {
  const url = env[CPT_KIT_URL_ENV]?.trim() ?? "";
  if (!/^https:\/\//i.test(url)) return null;
  return url;
}

function cleanName(value: string): string {
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function cptKitEmail(kitUrl: string): { subject: string; text: string; html: string } {
  const text = [
    CPT_KIT_EMAIL_LEAD,
    "",
    "CPT 92507 is deleted after 12/31/2026. On 1/1/2027 it is replaced by new timed base and add-on code pairs.",
    "",
    "In the kit:",
    "One-page job aid",
    "Minutes-to-units calculator. Enter your own payer rates.",
    "",
    kitUrl,
    "",
    CPT_KIT_DISCLAIMER,
    "",
    CPT_KIT_UPSELL,
    CPT_KIT_BUILDER_PRO_GO,
    "",
    QMS_SPAM,
  ].join("\n");
  const html = [
    `<p>${escapeHtml(CPT_KIT_EMAIL_LEAD)}</p>`,
    "<p>CPT 92507 is deleted after 12/31/2026. On 1/1/2027 it is replaced by new timed base and add-on code pairs.</p>",
    "<ul><li>One-page job aid</li><li>Minutes-to-units calculator. Enter your own payer rates.</li></ul>",
    `<p><a href="${escapeHtml(kitUrl)}">Open the 2027 SLP CPT Code Transition Kit</a></p>`,
    `<p>${escapeHtml(CPT_KIT_DISCLAIMER)}</p>`,
    `<p><a href="${CPT_KIT_BUILDER_PRO_GO}">${escapeHtml(CPT_KIT_UPSELL)}</a></p>`,
    `<p>${escapeHtml(QMS_SPAM)}</p>`,
  ].join("");
  return { subject: CPT_KIT_EMAIL_LEAD, text, html };
}

export type CptKitSubmitResult = { ok: true } | { ok: false; code: "email" | "name" | "rate" | "send" };

/**
 * Name and email are required. The kit link is emailed, never returned to the page.
 * Mailchimp tags are `cpt-kit`, `lead-magnet`, and `therapy`. A popup submit also gets `popup`.
 * An address in LEAD_QA_EMAILS skips the one-send claim and is also tagged `qa`.
 * A missing or non-https CPT_KIT_URL is logged and does not send. Mailchimp failures do not block the email.
 */
export async function submitCptKit(input: {
  email: string;
  name: string;
  company: string;
  ip: string;
  env: NodeJS.ProcessEnv;
  popup?: boolean;
  fetchImpl?: typeof fetch;
  store?: EventStore;
  now?: number;
}): Promise<CptKitSubmitResult> {
  if (input.company.trim()) return { ok: true };
  const email = normalizeBuyerEmail(input.email);
  if (!email) return { ok: false, code: "email" };
  const name = cleanName(input.name);
  if (!name) return { ok: false, code: "name" };
  if (cptKitRateLimited(input.ip, input.now ?? Date.now())) return { ok: false, code: "rate" };

  const kitUrl = cptKitUrl(input.env);
  const source = input.popup ? "cpt-kit-popup" : "cpt-kit";
  if (!kitUrl) {
    console.error(JSON.stringify({ source, step: "kit_url", ok: false, reason: "unset" }));
    return { ok: false, code: "send" };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const store = input.store ?? createEventStore(input.env);
  const qa = isLeadQaEmail(email, input.env);
  await captureCptKitLead({ email, name, popup: input.popup === true, qa, env: input.env, fetchImpl });

  const claim = cptKitClaimKey(email);
  if (!qa) {
    const claimed = await store.claimCredentialSend(claim);
    if (!claimed) return { ok: true };
  }
  try {
    const content = cptKitEmail(kitUrl);
    const sent = await sendResendEmail({
      email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      env: input.env,
      fetchImpl,
    });
    if (!sent) throw new Error("Set RESEND_API_KEY so the kit can be emailed.");
    logResendSent({ source, id: sent.id, email });
    return { ok: true };
  } catch (error) {
    if (!qa) await store.releaseCredentialSend(claim);
    const message = error instanceof Error ? error.message : "send";
    console.error(JSON.stringify({ source, step: "resend", ok: false, reason: message.includes("@") ? "send" : message }));
    return { ok: false, code: "send" };
  }
}
