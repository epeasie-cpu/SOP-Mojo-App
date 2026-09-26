import { Resend } from "resend";
import type { LeaveBrowserAction } from "./leave-gate";
import { LEAVE_BROWSER_ACTIONS } from "./leave-gate";
import { mailchimpSettings, tagAudienceMember, type CaptureResult } from "./mailchimp";
import type { SopDraft, SopStep } from "./sop";
import { sopFilename, sopToMarkdown, sopToPrintHtml } from "./sop-export";

/**
 * Sandbox from-address for local/dev.
 * Production should set EMAIL_FROM to a verified domain address,
 * for example `SOP Mojo <writer@sopmojo.com>`.
 */
export const DEFAULT_EMAIL_FROM = "SOP Mojo Writer <onboarding@resend.dev>";

export const EMAIL_SEND_ERROR =
  "We couldn't send the SOP to that inbox. Check the address and try again.";

const MAX_PAYLOAD = 100_000;
const INTENTS = new Set<string>(LEAVE_BROWSER_ACTIONS.map((item) => item.id));

export type SopEmailAttachment = {
  filename: string;
  content: string;
  contentType: string;
};

export type SopEmailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: SopEmailAttachment[];
};

export type SendSopEmail = (message: SopEmailMessage) => Promise<{ ok: boolean }>;

export type EmailSopResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

type ParsedEmailSop = {
  email: string;
  intent: LeaveBrowserAction;
  sop: SopDraft;
};

export function resolveEmailFrom(env: NodeJS.ProcessEnv): string {
  const configured = env.EMAIL_FROM?.trim();
  return configured || DEFAULT_EMAIL_FROM;
}

function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function asText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > max) return null;
  return trimmed;
}

function asList(value: unknown, maxItems: number, maxLen: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const items: string[] = [];
  for (const item of value) {
    const text = asText(item, maxLen);
    if (text === null) return null;
    items.push(text);
  }
  return items;
}

function parseSteps(value: unknown): SopStep[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const steps: SopStep[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const step = item as Record<string, unknown>;
    const title = asText(step.title, 500);
    const detail = asText(step.detail, 4000);
    if (!title || detail === null || typeof step.number !== "number" || !Number.isFinite(step.number)) {
      return null;
    }
    steps.push({ number: step.number, title, detail });
  }
  return steps;
}

export function parseSopDraft(value: unknown): SopDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = asText(record.title, 180);
  const purpose = asText(record.purpose, 4000);
  const owner = asText(record.owner, 500);
  const trigger = asText(record.trigger, 2000);
  const kpi = asText(record.kpi, 2000);
  const tools = asList(record.tools, 40, 300);
  const exceptions = asList(record.exceptions, 40, 1000);
  const checklist = asList(record.checklist, 40, 1000);
  const safetyNotes = asList(record.safetyNotes, 40, 1000);
  const steps = parseSteps(record.steps);
  if (!title || purpose === null || owner === null || trigger === null || kpi === null) return null;
  if (!tools || !exceptions || !checklist || !safetyNotes || !steps) return null;
  return { title, purpose, owner, trigger, tools, kpi, steps, exceptions, checklist, safetyNotes };
}

export function parseEmailSopRequest(body: unknown): ParsedEmailSop | { error: string } {
  if (!body || typeof body !== "object") return { error: "Missing SOP draft." };
  if (JSON.stringify(body).length > MAX_PAYLOAD) return { error: "That SOP is too large to email." };
  const record = body as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  if (!isEmail(email)) return { error: "Enter a valid email." };
  if (typeof record.intent !== "string" || !INTENTS.has(record.intent)) {
    return { error: "Missing SOP draft." };
  }
  const sop = parseSopDraft(record.sop);
  if (!sop) return { error: "Missing SOP draft." };
  return { email, intent: record.intent as LeaveBrowserAction, sop };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeSubjectTitle(title: string): string {
  return title.replace(/[\r\n]+/g, " ").slice(0, 120);
}

function printPack(intent: LeaveBrowserAction): boolean {
  return intent === "print" || intent === "download-html";
}

export function buildSopEmail(input: {
  email: string;
  intent: LeaveBrowserAction;
  sop: SopDraft;
  from: string;
}): SopEmailMessage {
  const title = safeSubjectTitle(input.sop.title);
  const subject = `Your SOP: ${title}`;
  if (printPack(input.intent)) {
    const htmlFile = sopToPrintHtml(input.sop);
    const text = [
      `Here is the SOP you drafted with AI SOP Writer: ${input.sop.title}.`,
      "",
      "Attached is a print-ready HTML file. Open it in a browser, then print it or choose Save as PDF.",
      "",
      "Review it with the process owner before you train anyone.",
      "https://writer.sopmojo.com",
    ].join("\n");
    const html = `<p>Here is the SOP you drafted with AI SOP Writer: <strong>${escapeHtml(input.sop.title)}</strong>.</p>
<p>Attached is a print-ready HTML file. Open it in a browser, then print it or choose Save as PDF.</p>
<p>Review it with the process owner before you train anyone.</p>
<p><a href="https://writer.sopmojo.com">writer.sopmojo.com</a></p>`;
    return {
      from: input.from,
      to: input.email,
      subject,
      text,
      html,
      attachments: [
        {
          filename: sopFilename(input.sop, "html"),
          content: Buffer.from(htmlFile, "utf8").toString("base64"),
          contentType: "text/html; charset=utf-8",
        },
      ],
    };
  }

  const markdown = sopToMarkdown(input.sop);
  const text = [
    `Here is the SOP you drafted with AI SOP Writer: ${input.sop.title}.`,
    "",
    "The Markdown file is attached, and the same draft is included below.",
    "",
    markdown.trim(),
    "",
    "Review it with the process owner before you train anyone.",
    "https://writer.sopmojo.com",
  ].join("\n");
  const html = `<p>Here is the SOP you drafted with AI SOP Writer: <strong>${escapeHtml(input.sop.title)}</strong>.</p>
<p>The Markdown file is attached, and the same draft is included below.</p>
<pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(markdown.trim())}</pre>
<p>Review it with the process owner before you train anyone.</p>
<p><a href="https://writer.sopmojo.com">writer.sopmojo.com</a></p>`;
  return {
    from: input.from,
    to: input.email,
    subject,
    text,
    html,
    attachments: [
      {
        filename: sopFilename(input.sop, "md"),
        content: Buffer.from(markdown, "utf8").toString("base64"),
        contentType: "text/markdown; charset=utf-8",
      },
    ],
  };
}

export async function sendWithResend(
  message: SopEmailMessage,
  apiKey: string | undefined,
): Promise<{ ok: boolean }> {
  const key = apiKey?.trim();
  if (!key) {
    console.error("email-sop send skipped: RESEND_API_KEY is not set");
    return { ok: false };
  }
  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments.map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
      })),
    });
    if (result.error) {
      console.error("email-sop resend error", result.error.name, result.error.statusCode);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("email-sop resend threw", err instanceof Error ? err.message : "error");
    return { ok: false };
  }
}

async function tagWriterLead(input: {
  email: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  try {
    return await tagAudienceMember({
      email: input.email,
      tag: "writer",
      settings,
      fetchImpl: input.fetchImpl,
    });
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function deliverWriterSop(input: {
  body: unknown;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  send?: SendSopEmail;
}): Promise<EmailSopResult> {
  const parsed = parseEmailSopRequest(input.body);
  if ("error" in parsed) return { ok: false, error: parsed.error, status: 400 };

  const message = buildSopEmail({
    email: parsed.email,
    intent: parsed.intent,
    sop: parsed.sop,
    from: resolveEmailFrom(input.env),
  });
  const send = input.send ?? ((outbound) => sendWithResend(outbound, input.env.RESEND_API_KEY));

  const [sent, tagged] = await Promise.all([
    send(message).catch(() => ({ ok: false })),
    tagWriterLead({ email: parsed.email, env: input.env, fetchImpl: input.fetchImpl }),
  ]);

  if (!tagged.ok && !tagged.skipped) {
    console.error("email-sop mailchimp tag failed", tagged.reason);
  }
  if (!sent.ok) return { ok: false, error: EMAIL_SEND_ERROR, status: 502 };
  return { ok: true };
}
