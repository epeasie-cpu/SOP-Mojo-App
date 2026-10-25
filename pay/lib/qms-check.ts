import { createEventStore, type EventStore } from "./event-store";
import { sendResendEmail } from "./fulfillment";
import { captureFreeQmsLead } from "./mailchimp";
import { normalizeBuyerEmail } from "./open-checkout";
import { QMS_BUILDER_PRO_GO } from "./qms-page";
import { parseQmsAnswers, qmsActionPlan, scoreQms, type QmsAnswers, type QmsResult } from "./qms-score";

export const QMS_STARTER_PACK_ENV = "QMS_STARTER_PACK_URL";

export const QMS_EMAIL_LEAD = "Your Quality System Fit Check";

export const QMS_SPAM = "Check your junk and spam folder too.";

export const QMS_UPSELL = "Builder Pro is $39/mo. It is for writing the SOPs, not a substitute for a compliance-grade QMS.";

export const QMS_RATE_LIMIT = 5;

export const QMS_RATE_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

export function resetQmsRateLimit(): void {
  hits.clear();
}

export function qmsRateLimited(ip: string, now = Date.now()): boolean {
  const key = ip.trim() || "unknown";
  const recent = (hits.get(key) ?? []).filter((at) => now - at < QMS_RATE_WINDOW_MS);
  if (recent.length >= QMS_RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function qmsClaimKey(email: string): string {
  return `${email.trim().toLowerCase()}|qms-check`;
}

export function qmsStarterPackUrl(env: NodeJS.ProcessEnv): string | null {
  const url = env[QMS_STARTER_PACK_ENV]?.trim() ?? "";
  if (!/^https:\/\//i.test(url)) return null;
  return url;
}

function cleanName(value: string): string {
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function qmsPlanEmail(input: {
  result: QmsResult;
  answers: QmsAnswers;
  starterPackUrl: string | null;
}): { subject: string; text: string; html: string } {
  const plan = qmsActionPlan(input.answers, input.result);
  const gaps = input.result.gaps.map((gap) => `${gap.title} (${gap.missed} points short)`);
  const pack = input.starterPackUrl;
  const text = [
    QMS_EMAIL_LEAD,
    "",
    `Result: ${input.result.category}. ${input.result.categoryTitle}`,
    input.result.summary,
    "",
    `Process documentation score: ${input.result.score} / 100`,
    "",
    "Largest gaps:",
    ...(gaps.length > 0 ? gaps.map((gap) => `- ${gap}`) : ["- None of the five documentation answers left points on the table."]),
    "",
    "30-day action plan",
    ...plan.flatMap((step) => [step.label, step.text, ""]),
    ...(pack ? ["Quality Control Starter Pack", pack, ""] : []),
    QMS_UPSELL,
    QMS_BUILDER_PRO_GO,
    "",
    QMS_SPAM,
  ].join("\n");
  const html = [
    `<p>${escapeHtml(QMS_EMAIL_LEAD)}</p>`,
    `<p><strong>${escapeHtml(`Result: ${input.result.category}. ${input.result.categoryTitle}`)}</strong></p>`,
    `<p>${escapeHtml(input.result.summary)}</p>`,
    `<p>Process documentation score: ${input.result.score} / 100</p>`,
    "<p>Largest gaps:</p>",
    `<ul>${(gaps.length > 0 ? gaps : ["None of the five documentation answers left points on the table."])
      .map((gap) => `<li>${escapeHtml(gap)}</li>`)
      .join("")}</ul>`,
    "<p>30-day action plan</p>",
    ...plan.map((step) => `<p><strong>${escapeHtml(step.label)}</strong><br/>${escapeHtml(step.text)}</p>`),
    pack ? `<p><a href="${escapeHtml(pack)}">Quality Control Starter Pack</a></p>` : "",
    `<p><a href="${QMS_BUILDER_PRO_GO}">${escapeHtml(QMS_UPSELL)}</a></p>`,
    `<p>${escapeHtml(QMS_SPAM)}</p>`,
  ].join("");
  return { subject: QMS_EMAIL_LEAD, text, html };
}

export type QmsSubmitResult = { ok: true } | { ok: false; code: "email" | "name" | "answers" | "rate" | "send" };

/**
 * Honeypot, then Mailchimp tags `qms` and `lead-magnet`, then one Resend email per address.
 * A filled honeypot looks successful and calls nothing. There is no Make webhook.
 */
export async function submitQmsCheck(input: {
  email: string;
  name: string;
  company: string;
  answers: Record<string, unknown>;
  ip: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  store?: EventStore;
  now?: number;
}): Promise<QmsSubmitResult> {
  if (input.company.trim()) return { ok: true };
  const email = normalizeBuyerEmail(input.email);
  if (!email) return { ok: false, code: "email" };
  const name = cleanName(input.name);
  if (!name) return { ok: false, code: "name" };
  const answers = parseQmsAnswers(input.answers);
  if (!answers) return { ok: false, code: "answers" };
  if (qmsRateLimited(input.ip, input.now ?? Date.now())) return { ok: false, code: "rate" };

  const fetchImpl = input.fetchImpl ?? fetch;
  const store = input.store ?? createEventStore(input.env);
  await captureFreeQmsLead({ email, name, env: input.env, fetchImpl });

  const claim = qmsClaimKey(email);
  const claimed = await store.claimCredentialSend(claim);
  if (!claimed) return { ok: true };
  try {
    const result = scoreQms(answers);
    const content = qmsPlanEmail({ result, answers, starterPackUrl: qmsStarterPackUrl(input.env) });
    const sent = await sendResendEmail({
      email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      env: input.env,
      fetchImpl,
    });
    if (!sent) throw new Error("Set RESEND_API_KEY so the action plan can be emailed.");
    return { ok: true };
  } catch {
    await store.releaseCredentialSend(claim);
    return { ok: false, code: "send" };
  }
}

