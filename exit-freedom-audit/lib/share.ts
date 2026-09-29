import { Resend } from "resend";
import { isEmail, normalizeEmail } from "./email";
import { PRODUCT_LINKS, SITE } from "./site";

export const DEFAULT_EMAIL_FROM = "SOP Mojo <onboarding@resend.dev>";

export const SHARE_UNAVAILABLE =
  "Email share needs RESEND_API_KEY on the server. Your score stays on this device.";

export const SHARE_SEND_ERROR =
  "We couldn't send that email. Check the address and try again.";

const BAND_LABELS = new Set([
  "Fragile — key-person dependent",
  "Building — not yet scalable",
  "Ready — can run without you",
]);

const MAX_BODY = 20_000;

export type ShareSummary = {
  score: number;
  bandLabel: string;
  documentation: number;
  coverage: number;
  maps: number;
  tools: number;
  gaps: string[];
  breakout: { label: string; value: string }[];
};

export type ShareMessage = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
};

export type SendShareEmail = (message: ShareMessage) => Promise<{ ok: boolean }>;

export type ShareResponse = {
  ok: boolean;
  error?: string;
};

export function resolveEmailFrom(env: NodeJS.ProcessEnv): string {
  const configured = env.EMAIL_FROM?.trim();
  return configured || DEFAULT_EMAIL_FROM;
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

export function parseShareBody(body: unknown): { to: string; replyTo?: string; summary: ShareSummary } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Missing score summary." };
  if (JSON.stringify(body).length > MAX_BODY) return { error: "That summary is too large to email." };
  const record = body as Record<string, unknown>;
  const to = normalizeEmail(record.to);
  if (!isEmail(to)) return { error: "Enter a valid Ops email." };
  const replyRaw = normalizeEmail(record.replyTo);
  const replyTo = isEmail(replyRaw) ? replyRaw : undefined;
  const summary = record.summary;
  if (!summary || typeof summary !== "object") return { error: "Missing score summary." };
  const card = summary as Record<string, unknown>;
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
  if (!Array.isArray(card.gaps) || card.gaps.length === 0 || card.gaps.length > 6) {
    return { error: "Missing score summary." };
  }
  const gaps: string[] = [];
  for (const gap of card.gaps) {
    const line = cleanLine(gap, 180);
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
    const value = cleanLine(row.value, 200);
    if (!label || !value) return { error: "Missing score summary." };
    breakout.push({ label, value });
  }
  return {
    to,
    replyTo,
    summary: { score, bandLabel, documentation, coverage, maps, tools, gaps, breakout },
  };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildShareEmail(input: {
  to: string;
  replyTo?: string;
  summary: ShareSummary;
  from: string;
}): ShareMessage {
  const { summary } = input;
  const subject = `Our Ops Scalability Score — ${summary.score}/100`;
  const dimensions = `Documentation ${summary.documentation} · Coverage ${summary.coverage} · Maps ${summary.maps} · Tools ${summary.tools}`;
  const gapLines = summary.gaps.map((gap) => `• ${gap}`);
  const breakoutLines = summary.breakout.map((item) => `${item.label}: ${item.value}`);
  const linkLines = PRODUCT_LINKS.map((link) => link.href);
  const text = [
    "Team — here's where we stand.",
    "",
    "I ran SOP Mojo's Ops Scalability Score. Sharing so we're aligned.",
    "",
    `${summary.score} / 100`,
    summary.bandLabel,
    dimensions,
    "",
    "Priority gaps",
    ...gapLines,
    "",
    "Directional breakout",
    ...breakoutLines,
    "Sellability is a directional band from this quiz, not a valuation and not an industry multiple.",
    "",
    `Open the audit: ${SITE.host}`,
    "",
    "Score powered by SOP Mojo",
    "Let SOP Mojo help you scale — write SOPs, map workflows, build the system.",
    ...linkLines,
  ].join("\n");

  const gapHtml = summary.gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join("");
  const breakoutHtml = summary.breakout
    .map((item) => `<li><strong>${escapeHtml(item.label)}.</strong> ${escapeHtml(item.value)}</li>`)
    .join("");
  const linkHtml = PRODUCT_LINKS.map(
    (link) =>
      `<a href="${link.href}" style="color:#d4d4d8;text-decoration:underline">${escapeHtml(link.label)}</a>`,
  ).join(" · ");

  const html = `<div style="margin:0;padding:24px;background:#e8eaee;font-family:ui-sans-serif,system-ui,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="padding:28px 28px 8px;">
      <h1 style="margin:0;font-size:28px;line-height:1.2;">Team — here's where we stand.</h1>
      <p style="margin:12px 0 0;color:#52525b;font-size:16px;line-height:1.5;">I ran SOP Mojo's Ops Scalability Score. Sharing so we're aligned.</p>
      <div style="margin:20px 0;padding:28px 16px;background:#f4f5f7;border-radius:16px;text-align:center;">
        <div style="font-size:44px;font-weight:800;letter-spacing:-0.04em;">${summary.score} / 100</div>
        <div style="margin-top:8px;color:#157a32;font-weight:700;">${escapeHtml(summary.bandLabel)}</div>
        <div style="margin-top:8px;color:#71717a;font-size:14px;">${escapeHtml(dimensions)}</div>
      </div>
      <h2 style="margin:8px 0 0;font-size:18px;">Priority gaps</h2>
      <ul style="margin:8px 0 0;padding-left:18px;color:#18181b;line-height:1.5;">${gapHtml}</ul>
      <h2 style="margin:20px 0 0;font-size:18px;">Directional breakout</h2>
      <ul style="margin:8px 0 0;padding-left:18px;color:#18181b;line-height:1.5;">${breakoutHtml}</ul>
      <p style="margin:8px 0 0;color:#71717a;font-size:13px;line-height:1.45;">Sellability is a directional band from this quiz, not a valuation and not an industry multiple.</p>
      <p style="margin:20px 0 28px;">
        <a href="${SITE.host}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Open full report</a>
      </p>
    </div>
    <div style="background:#111111;color:#fafafa;padding:24px 28px;text-align:center;">
      <div style="color:#3dcc4a;font-weight:700;">Score powered by SOP Mojo</div>
      <p style="margin:8px 0;font-size:14px;line-height:1.5;">Let SOP Mojo help you scale — write SOPs, map workflows, build the system.</p>
      <p style="margin:0;font-size:13px;">${linkHtml}</p>
    </div>
  </div>
</div>`;

  return {
    from: input.from,
    to: input.to,
    replyTo: input.replyTo,
    subject,
    text,
    html,
  };
}

export async function sendWithResend(
  message: ShareMessage,
  apiKey: string | undefined,
): Promise<{ ok: boolean }> {
  const key = apiKey?.trim();
  if (!key) {
    console.error("audit share skipped: RESEND_API_KEY is not set");
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
      console.error("audit share resend error", result.error.name);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("audit share resend threw", err instanceof Error ? err.message : "error");
    return { ok: false };
  }
}

export async function handleShare(input: {
  body: unknown;
  env: NodeJS.ProcessEnv;
  send?: SendShareEmail;
}): Promise<{ status: number; body: ShareResponse }> {
  const parsed = parseShareBody(input.body);
  if ("error" in parsed) return { status: 400, body: { ok: false, error: parsed.error } };
  const apiKey = input.env.RESEND_API_KEY?.trim();
  if (!input.send && !apiKey) {
    return { status: 503, body: { ok: false, error: SHARE_UNAVAILABLE } };
  }
  const message = buildShareEmail({
    to: parsed.to,
    replyTo: parsed.replyTo,
    summary: parsed.summary,
    from: resolveEmailFrom(input.env),
  });
  const send = input.send ?? ((outbound) => sendWithResend(outbound, apiKey));
  try {
    const sent = await send(message);
    if (!sent.ok) return { status: 502, body: { ok: false, error: SHARE_SEND_ERROR } };
    return { status: 200, body: { ok: true } };
  } catch {
    return { status: 502, body: { ok: false, error: SHARE_SEND_ERROR } };
  }
}
