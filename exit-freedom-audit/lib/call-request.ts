import { Resend } from "resend";
import { isEmail, normalizeEmail } from "./email";
import type { ShareSummary } from "./score";
import { PRODUCT_LINKS, SITE } from "./site";

export const DEFAULT_EMAIL_FROM = "SOP Mojo <onboarding@resend.dev>";

/** Confirmed call-request inbox. Used when CALL_REQUEST_TO and MEETING_REQUEST_TO are unset. */
export const DEFAULT_CALL_REQUEST_TO = "ryan@sopmojo.com";

export const CALL_NOT_CONFIGURED =
  "Call requests are not configured yet. Nothing was sent.";

export const CALL_NEEDS_RESEND =
  "Call requests need RESEND_API_KEY on the server. Nothing was sent.";

export const CALL_SEND_ERROR = "We couldn't send that request. Try again.";

const BAND_LABELS = new Set([
  "Fragile — key-person dependent",
  "Building — not yet scalable",
  "Ready — can run without you",
]);

const MAX_BODY = 20_000;

export type CallMessage = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

export type SendCallEmail = (message: CallMessage) => Promise<{ ok: boolean }>;

export type CallResponse = {
  ok: boolean;
  error?: string;
};

export type CallRequest = {
  email: string;
  name?: string;
  note?: string;
  summary?: ShareSummary;
};

export function resolveEmailFrom(env: NodeJS.ProcessEnv): string {
  const configured = env.EMAIL_FROM?.trim();
  return configured || DEFAULT_EMAIL_FROM;
}

/**
 * Recipient inbox. `CALL_REQUEST_TO` wins, then `MEETING_REQUEST_TO`.
 * A blank value uses ryan@sopmojo.com. A non-email value is rejected and does not fall back.
 */
export function resolveCallRecipient(env: NodeJS.ProcessEnv): string | null {
  const raw = env.CALL_REQUEST_TO?.trim() || env.MEETING_REQUEST_TO?.trim() || "";
  if (!raw) return DEFAULT_CALL_REQUEST_TO;
  const email = normalizeEmail(raw);
  return isEmail(email) ? email : null;
}

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) return null;
  return value;
}

function cleanLine(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\r\n\t]+/g, " ").trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function cleanNote(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 1000) return null;
  return trimmed;
}

function parseSummary(value: unknown): ShareSummary | undefined | { error: string } {
  if (value === undefined || value === null) return undefined;
  if (!value || typeof value !== "object") return { error: "Missing score summary." };
  const card = value as Record<string, unknown>;
  const score = clampScore(card.score);
  const documentation = clampScore(card.documentation);
  const coverage = clampScore(card.coverage);
  const maps = clampScore(card.maps);
  const tools = clampScore(card.tools);
  const bandLabel = cleanLine(card.bandLabel, 80);
  if (
    score === null ||
    documentation === null ||
    coverage === null ||
    maps === null ||
    tools === null ||
    !bandLabel ||
    !BAND_LABELS.has(bandLabel)
  ) {
    return { error: "Missing score summary." };
  }
  if (!Array.isArray(card.gaps) || card.gaps.length === 0 || card.gaps.length > 8) {
    return { error: "Missing score summary." };
  }
  const gaps: string[] = [];
  for (const gap of card.gaps) {
    const line = cleanLine(gap, 240);
    if (!line) return { error: "Missing score summary." };
    gaps.push(line);
  }
  if (!Array.isArray(card.breakout) || card.breakout.length === 0 || card.breakout.length > 8) {
    return { error: "Missing score summary." };
  }
  const breakout: { label: string; value: string }[] = [];
  for (const item of card.breakout) {
    if (!item || typeof item !== "object") return { error: "Missing score summary." };
    const row = item as Record<string, unknown>;
    const label = cleanLine(row.label, 80);
    const detail = cleanLine(row.value, 400);
    if (!label || !detail) return { error: "Missing score summary." };
    breakout.push({ label, value: detail });
  }
  return { score, bandLabel, documentation, coverage, maps, tools, gaps, breakout };
}

export function parseCallBody(body: unknown): CallRequest | { error: string } {
  if (!body || typeof body !== "object") return { error: "Enter a valid email." };
  if (JSON.stringify(body).length > MAX_BODY) return { error: "That request is too large to send." };
  const record = body as Record<string, unknown>;
  const email = normalizeEmail(record.email);
  if (!isEmail(email)) return { error: "Enter a valid email." };
  const name = record.name === undefined || record.name === "" ? undefined : cleanLine(record.name, 80);
  if (name === null) return { error: "Enter a shorter name." };
  const note = cleanNote(record.note);
  if (note === null) return { error: "Shorten the note and try again." };
  const summary = parseSummary(record.summary);
  if (summary && "error" in summary) return summary;
  return { email, name, note, summary };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildCallEmail(input: {
  to: string;
  request: CallRequest;
  from: string;
}): CallMessage {
  const { request } = input;
  const who = request.name ? `${request.name} (${request.email})` : request.email;
  const subject = request.summary
    ? `Request a call — Ops Scalability Score ${request.summary.score}/100`
    : "Request a call — Ops Scalability Score";
  const opener = `${who} wants to discuss how SOP Mojo can help document their workflows.`;
  const summary = request.summary;
  const summaryLines = summary
    ? [
        "",
        "Score summary",
        `${summary.score} / 100`,
        summary.bandLabel,
        `Documentation ${summary.documentation} · Coverage ${summary.coverage} · Maps ${summary.maps} · Tools ${summary.tools}`,
        "",
        "Priority gaps",
        ...summary.gaps.map((gap) => `• ${gap}`),
        "",
        "Directional breakout",
        ...summary.breakout.map((item) => `${item.label}: ${item.value}`),
        "Sellability is a directional band from this audit, not a valuation and not an industry multiple.",
      ]
    : [];
  const noteLines = request.note ? ["", "Note", request.note] : [];
  const linkLines = PRODUCT_LINKS.map((link) => link.href);
  const text = [
    opener,
    ...noteLines,
    ...summaryLines,
    "",
    `Open the audit: ${SITE.host}`,
    "",
    "Let SOP Mojo help you scale — write SOPs, map workflows, build the system.",
    ...linkLines,
  ].join("\n");

  const summaryHtml = summary
    ? `<h2 style="margin:20px 0 0;font-size:18px;">Score summary</h2>
      <p style="margin:8px 0 0;font-size:28px;font-weight:800;">${summary.score} / 100</p>
      <p style="margin:4px 0 0;color:#157a32;font-weight:700;">${escapeHtml(summary.bandLabel)}</p>
      <p style="margin:4px 0 0;color:#71717a;font-size:14px;">Documentation ${summary.documentation} · Coverage ${summary.coverage} · Maps ${summary.maps} · Tools ${summary.tools}</p>
      <h2 style="margin:16px 0 0;font-size:18px;">Priority gaps</h2>
      <ul style="margin:8px 0 0;padding-left:18px;line-height:1.5;">${summary.gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join("")}</ul>
      <h2 style="margin:16px 0 0;font-size:18px;">Directional breakout</h2>
      <ul style="margin:8px 0 0;padding-left:18px;line-height:1.5;">${summary.breakout
        .map((item) => `<li><strong>${escapeHtml(item.label)}.</strong> ${escapeHtml(item.value)}</li>`)
        .join("")}</ul>
      <p style="margin:8px 0 0;color:#71717a;font-size:13px;">Sellability is a directional band from this audit, not a valuation and not an industry multiple.</p>`
    : "";
  const noteHtml = request.note
    ? `<h2 style="margin:16px 0 0;font-size:18px;">Note</h2><p style="margin:8px 0 0;white-space:pre-wrap;">${escapeHtml(request.note)}</p>`
    : "";
  const linkHtml = PRODUCT_LINKS.map(
    (link) =>
      `<a href="${link.href}" style="color:#d4d4d8;text-decoration:underline">${escapeHtml(link.label)}</a>`,
  ).join(" · ");

  const html = `<div style="margin:0;padding:24px;background:#e8eaee;font-family:ui-sans-serif,system-ui,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="padding:28px 28px 8px;">
      <h1 style="margin:0;font-size:24px;line-height:1.3;">Request a call</h1>
      <p style="margin:12px 0 0;font-size:16px;line-height:1.5;">${escapeHtml(opener)}</p>
      ${noteHtml}
      ${summaryHtml}
      <p style="margin:20px 0 28px;">
        <a href="${SITE.host}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Open the audit</a>
      </p>
    </div>
    <div style="background:#111111;color:#fafafa;padding:24px 28px;text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;line-height:1.5;">Let SOP Mojo help you scale — write SOPs, map workflows, build the system.</p>
      <p style="margin:0;font-size:13px;">${linkHtml}</p>
    </div>
  </div>
</div>`;

  return {
    from: input.from,
    to: input.to,
    replyTo: request.email,
    subject,
    text,
    html,
  };
}

export async function sendWithResend(
  message: CallMessage,
  apiKey: string | undefined,
): Promise<{ ok: boolean }> {
  const key = apiKey?.trim();
  if (!key) {
    console.error("audit call request skipped: RESEND_API_KEY is not set");
    return { ok: false };
  }
  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: message.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (result.error) {
      console.error("audit call request resend error", result.error.name);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("audit call request resend threw", err instanceof Error ? err.message : "error");
    return { ok: false };
  }
}

export async function handleCallRequest(input: {
  body: unknown;
  env: NodeJS.ProcessEnv;
  send?: SendCallEmail;
}): Promise<{ status: number; body: CallResponse }> {
  const parsed = parseCallBody(input.body);
  if ("error" in parsed) return { status: 400, body: { ok: false, error: parsed.error } };
  const recipient = resolveCallRecipient(input.env);
  if (!recipient) {
    return { status: 503, body: { ok: false, error: CALL_NOT_CONFIGURED } };
  }
  const apiKey = input.env.RESEND_API_KEY?.trim();
  if (!input.send && !apiKey) {
    return { status: 503, body: { ok: false, error: CALL_NEEDS_RESEND } };
  }
  const message = buildCallEmail({
    to: recipient,
    request: parsed,
    from: resolveEmailFrom(input.env),
  });
  const send = input.send ?? ((outbound) => sendWithResend(outbound, apiKey));
  try {
    const sent = await send(message);
    if (!sent.ok) return { status: 502, body: { ok: false, error: CALL_SEND_ERROR } };
    return { status: 200, body: { ok: true } };
  } catch {
    return { status: 502, body: { ok: false, error: CALL_SEND_ERROR } };
  }
}
