import { logResendSent } from "./delivery-log";
import { createEventStore, type EventStore } from "./event-store";
import { sendResendEmail } from "./fulfillment";
import { isLeadQaEmail } from "./lead-qa";
import { captureCptKitLead } from "./mailchimp";
import { normalizeBuyerEmail } from "./open-checkout";
import { CPT_KIT_BUILDER_PRO_GO } from "./cpt-kit-page";
import { QMS_SPAM } from "./qms-check";
import { SITE } from "./site";

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

export const CPT_KIT_EMAIL_LOGO = `${SITE.host}/email/sop-mojo-logo.png`;

const CPT_KIT_EMAIL_BODY =
  "Your kit has two pieces. The one-page job aid covers the 2027 codes that replace 92507. The minutes-to-units calculator is where you enter your own payer rates.";

const CPT_KIT_EMAIL_USE =
  "Keep the job aid at the front desk or in the billing binder, and enter your payer rates in the calculator's yellow cells. Confirm with each payer.";

const CPT_KIT_EMAIL_BUILDER =
  "Want this as a written billing SOP your team actually follows? SOP Builder Pro helps you build it.";

const CPT_KIT_EMAIL_BUILDER_LABEL = "See SOP Builder Pro";

/** First word of the name, or empty when there is nothing safe to greet. */
export function cptKitFirstName(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f]/g, "").trim();
  return (cleaned.split(/\s+/)[0] ?? "").slice(0, 40);
}

function bulletproofButton(input: { href: string; label: string; outline?: boolean }): string {
  const href = escapeHtml(input.href);
  const label = escapeHtml(input.label);
  const fill = input.outline ? "#ffffff" : "#C1FF72";
  const border = input.outline ? "border:2px solid #0C0E0C;" : "border:0;";
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">`,
    `<tr><td align="left" bgcolor="${fill}" style="background:${fill};${border}border-radius:4px;">`,
    `<a href="${href}" style="display:inline-block;padding:14px 24px;font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:16px;line-height:20px;font-weight:700;color:#0C0E0C;text-decoration:none;">${label}</a>`,
    `</td></tr></table>`,
  ].join("");
}

export function cptKitEmail(kitUrl: string, name = ""): { subject: string; text: string; html: string } {
  const first = cptKitFirstName(name);
  const greeting = first ? `Hi ${first},` : "Hi there,";
  const safeGreeting = escapeHtml(greeting);
  const text = [
    greeting,
    "",
    CPT_KIT_EMAIL_BODY,
    "",
    `Open your kit: ${kitUrl}`,
    "",
    CPT_KIT_EMAIL_USE,
    "",
    CPT_KIT_EMAIL_BUILDER,
    CPT_KIT_BUILDER_PRO_GO,
    "",
    "Ryan Pease",
    "SOP Mojo",
    "",
    QMS_SPAM,
  ].join("\n");
  const cell = "padding:0 24px 24px 24px;font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#0C0E0C;";
  const html = [
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">`,
    `</head><body style="margin:0;padding:0;background:#f4f5f3;">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f3;">`,
    `<tr><td align="center" style="padding:24px;">`,
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;">`,
    `<tr><td style="padding:24px 24px 24px 24px;">`,
    `<img src="${CPT_KIT_EMAIL_LOGO}" alt="SOP Mojo" width="180" height="40" style="display:block;border:0;outline:none;text-decoration:none;">`,
    `</td></tr>`,
    `<tr><td style="${cell}font-family:'Space Grotesk',Arial,Helvetica,sans-serif;font-size:24px;line-height:32px;font-weight:650;">${safeGreeting}</td></tr>`,
    `<tr><td style="${cell}">${escapeHtml(CPT_KIT_EMAIL_BODY)}</td></tr>`,
    `<tr><td style="${cell}">${bulletproofButton({ href: kitUrl, label: "Open your kit" })}</td></tr>`,
    `<tr><td style="${cell}">${escapeHtml(CPT_KIT_EMAIL_USE)}</td></tr>`,
    `<tr><td style="${cell}">${escapeHtml(CPT_KIT_EMAIL_BUILDER)}</td></tr>`,
    `<tr><td style="${cell}">${bulletproofButton({ href: CPT_KIT_BUILDER_PRO_GO, label: CPT_KIT_EMAIL_BUILDER_LABEL, outline: true })}</td></tr>`,
    `<tr><td style="${cell}">Ryan Pease<br>SOP Mojo</td></tr>`,
    `<tr><td style="padding:0 24px 24px 24px;font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#3f3f46;">${escapeHtml(QMS_SPAM)}</td></tr>`,
    `</table></td></tr></table></body></html>`,
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
    const content = cptKitEmail(kitUrl, name);
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
