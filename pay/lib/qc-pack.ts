import { logResendSent } from "./delivery-log";
import { createEventStore, type EventStore } from "./event-store";
import { sendResendEmail } from "./fulfillment";
import { captureQcPackLead } from "./mailchimp";
import { normalizeBuyerEmail } from "./open-checkout";
import { QC_PACK_CHECK_URL } from "./qc-pack-page";
import { QMS_BUILDER_PRO_GO } from "./qms-page";
import { QMS_SPAM, QMS_UPSELL, qmsStarterPackUrl } from "./qms-check";

export const QC_PACK_EMAIL_LEAD = "Your Quality Control Starter Pack";

export const QC_PACK_RATE_LIMIT = 5;

export const QC_PACK_RATE_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

export function resetQcPackRateLimit(): void {
  hits.clear();
}

export function qcPackRateLimited(ip: string, now = Date.now()): boolean {
  const key = ip.trim() || "unknown";
  const recent = (hits.get(key) ?? []).filter((at) => now - at < QC_PACK_RATE_WINDOW_MS);
  if (recent.length >= QC_PACK_RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function qcPackClaimKey(email: string): string {
  return `${email.trim().toLowerCase()}|qc-pack`;
}

function cleanName(value: string): string {
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function qcPackEmail(packUrl: string): { subject: string; text: string; html: string } {
  const text = [
    QC_PACK_EMAIL_LEAD,
    "",
    "Copy these Google Docs and Sheets:",
    "00 START HERE (set up basic quality control in one week)",
    "01 Inspection Checklist",
    "02 Nonconformance & CAPA Log",
    "03 Quality KPI Tracker",
    "04 SOP Review Log",
    "",
    packUrl,
    "",
    "2-minute QMS check:",
    QC_PACK_CHECK_URL,
    "",
    QMS_UPSELL,
    QMS_BUILDER_PRO_GO,
    "",
    QMS_SPAM,
  ].join("\n");
  const html = [
    `<p>${escapeHtml(QC_PACK_EMAIL_LEAD)}</p>`,
    "<p>Copy these Google Docs and Sheets:</p>",
    "<ul><li>00 START HERE (set up basic quality control in one week)</li><li>01 Inspection Checklist</li><li>02 Nonconformance &amp; CAPA Log</li><li>03 Quality KPI Tracker</li><li>04 SOP Review Log</li></ul>",
    `<p><a href="${escapeHtml(packUrl)}">Open the Quality Control Starter Pack</a></p>`,
    `<p><a href="${QC_PACK_CHECK_URL}">Or take the 2-minute QMS check</a></p>`,
    `<p><a href="${QMS_BUILDER_PRO_GO}">${escapeHtml(QMS_UPSELL)}</a></p>`,
    `<p>${escapeHtml(QMS_SPAM)}</p>`,
  ].join("");
  return { subject: QC_PACK_EMAIL_LEAD, text, html };
}

export type QcPackSubmitResult = { ok: true } | { ok: false; code: "email" | "name" | "rate" | "send" };

/**
 * Name and email are required. The pack link is emailed, never returned to the page.
 * Mailchimp tags are `qms`, `lead-magnet`, and `qc-pack`. A popup submit also gets `popup`.
 * A missing QMS_STARTER_PACK_URL is logged and does not send. Mailchimp failures do not block the email.
 */
export async function submitQcPack(input: {
  email: string;
  name: string;
  company: string;
  ip: string;
  env: NodeJS.ProcessEnv;
  popup?: boolean;
  fetchImpl?: typeof fetch;
  store?: EventStore;
  now?: number;
}): Promise<QcPackSubmitResult> {
  if (input.company.trim()) return { ok: true };
  const email = normalizeBuyerEmail(input.email);
  if (!email) return { ok: false, code: "email" };
  const name = cleanName(input.name);
  if (!name) return { ok: false, code: "name" };
  if (qcPackRateLimited(input.ip, input.now ?? Date.now())) return { ok: false, code: "rate" };

  const packUrl = qmsStarterPackUrl(input.env);
  const source = input.popup ? "qc-pack-popup" : "qc-pack";
  if (!packUrl) {
    console.error(JSON.stringify({ source, step: "pack_url", ok: false, reason: "unset" }));
    return { ok: false, code: "send" };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const store = input.store ?? createEventStore(input.env);
  await captureQcPackLead({ email, name, popup: input.popup === true, env: input.env, fetchImpl });

  const claim = qcPackClaimKey(email);
  const claimed = await store.claimCredentialSend(claim);
  if (!claimed) return { ok: true };
  try {
    const content = qcPackEmail(packUrl);
    const sent = await sendResendEmail({
      email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      env: input.env,
      fetchImpl,
    });
    if (!sent) throw new Error("Set RESEND_API_KEY so the pack can be emailed.");
    logResendSent({ source, id: sent.id, email });
    return { ok: true };
  } catch (error) {
    await store.releaseCredentialSend(claim);
    const message = error instanceof Error ? error.message : "send";
    console.error(JSON.stringify({ source, step: "resend", ok: false, reason: message.includes("@") ? "send" : message }));
    return { ok: false, code: "send" };
  }
}
