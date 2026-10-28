import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE, publicOrigin } from "./site";

/** The only postal address Pay may print. */
export const MAILING_ADDRESS = "SOP Mojo, 1846 E. Innovation Park Dr. Suite 100, Oro Valley, AZ 85755 USA";

export const SPAM_FOLDER_LINE = "Check your junk and spam folder too.";

export const UNSUBSCRIBE_SECRET_ENV = "UNSUBSCRIBE_SECRET";

export const FROM_DISPLAY_NAME = "Ryan Pease | SOP Mojo";

export const VERIFIED_FROM_ADDRESS = "writer@sopmojo.com";

export const REPLY_TO_ADDRESS = SITE.founderEmail;

const UNSUBSCRIBE_RATE_LIMIT = 5;
const UNSUBSCRIBE_RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

export function resetUnsubscribeRateLimit(): void {
  hits.clear();
}

export function unsubscribeRateLimited(ip: string, now = Date.now()): boolean {
  const key = ip.trim() || "unknown";
  const recent = (hits.get(key) ?? []).filter((at) => now - at < UNSUBSCRIBE_RATE_WINDOW_MS);
  if (recent.length >= UNSUBSCRIBE_RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function unsubscribeSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env[UNSUBSCRIBE_SECRET_ENV]?.trim() || env.ADMIN_SESSION_SECRET?.trim() || env.ADMIN_ACCESS_CODE?.trim();
  return secret || null;
}

export function suppressionKey(email: string): string {
  return `${email.trim().toLowerCase()}|marketing-suppressed`;
}

export function signUnsubscribeToken(email: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = unsubscribeSecret(env);
  const normalized = email.trim().toLowerCase();
  if (!secret || !normalized.includes("@")) return null;
  const payload = Buffer.from(normalized, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(normalized).digest("base64url");
  return `${payload}.${sig}`;
}

export function readUnsubscribeToken(token: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = unsubscribeSecret(env);
  if (!secret || !token.includes(".")) return null;
  const splitAt = token.lastIndexOf(".");
  const payload = token.slice(0, splitAt);
  const sig = token.slice(splitAt + 1);
  if (!payload || !sig) return null;
  let email = "";
  try {
    email = Buffer.from(payload, "base64url").toString("utf8").trim().toLowerCase();
  } catch {
    return null;
  }
  if (!email.includes("@")) return null;
  const expected = createHmac("sha256", secret).update(email).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const again = Buffer.from(email, "utf8").toString("base64url");
  if (again !== payload) return null;
  return email;
}

export function unsubscribePageUrl(token: string, env: NodeJS.ProcessEnv = process.env): string {
  return `${publicOrigin(env)}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function unsubscribeApiUrl(token: string, env: NodeJS.ProcessEnv = process.env): string {
  return `${publicOrigin(env)}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function listUnsubscribeHeaders(email: string, env: NodeJS.ProcessEnv = process.env): Record<string, string> | null {
  const token = signUnsubscribeToken(email, env);
  if (!token) return null;
  const httpsUrl = unsubscribeApiUrl(token, env);
  return {
    "List-Unsubscribe": `<${httpsUrl}>, <mailto:${REPLY_TO_ADDRESS}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Keep a domain-verified sopmojo.com address already configured. Otherwise use writer@sopmojo.com. */
export function sendingAddress(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.EMAIL_FROM?.trim() ?? "";
  const bracket = configured.match(/<([^>]+)>/);
  const raw = (bracket?.[1] ?? (configured.includes("@") ? configured : "")).trim().toLowerCase();
  if (raw.endsWith("@sopmojo.com")) return raw;
  return VERIFIED_FROM_ADDRESS;
}

export function fromHeader(env: NodeJS.ProcessEnv = process.env): string {
  return `${FROM_DISPLAY_NAME} <${sendingAddress(env)}>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function emailReason(resource: string, reason: "requested" | "purchased"): string {
  const name = resource.trim() || "this";
  const verb = reason === "purchased" ? "purchased" : "requested";
  return `You're getting this because you ${verb} ${name} at sopmojo.com.`;
}

export type CanSpamOptions = {
  to?: string;
  resource: string;
  reason: "requested" | "purchased";
  marketing: boolean;
  env?: NodeJS.ProcessEnv;
};

function stripTrailingSpam(text: string): string {
  return text.replace(new RegExp(`(?:\\n)*${SPAM_FOLDER_LINE.replace(/[.]/g, "\\.")}\\s*$`), "").replace(/\s+$/, "");
}

export function withCanSpam(
  content: { subject: string; text: string; html: string },
  options: CanSpamOptions,
): { subject: string; text: string; html: string } {
  const env = options.env ?? process.env;
  const reason = emailReason(options.resource, options.reason);
  const token = options.marketing && options.to ? signUnsubscribeToken(options.to, env) : null;
  const pageUrl = token ? unsubscribePageUrl(token, env) : "";
  const textParts = [stripTrailingSpam(content.text), "", SPAM_FOLDER_LINE, "", MAILING_ADDRESS, "", reason];
  if (pageUrl) textParts.push("", `Unsubscribe: ${pageUrl}`);
  const htmlParts = [
    `<p style="margin:0 0 12px;font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#3f3f46;">${escapeHtml(SPAM_FOLDER_LINE)}</p>`,
    `<p style="margin:0 0 12px;font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#3f3f46;">${escapeHtml(MAILING_ADDRESS)}</p>`,
    `<p style="margin:0 0 12px;font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#3f3f46;">${escapeHtml(reason)}</p>`,
  ];
  if (pageUrl) {
    htmlParts.push(
      `<p style="margin:0;font-family:'Open Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#3f3f46;"><a href="${escapeHtml(pageUrl)}">Unsubscribe</a></p>`,
    );
  }
  const block = htmlParts.join("");
  const insideCard = "</table></td></tr></table></body>";
  const html = content.html.includes(insideCard)
    ? content.html.replace(insideCard, `<tr><td style="padding:0 24px 24px;">${block}</td></tr>${insideCard}`)
    : `${content.html}${block}`;
  return { subject: content.subject, text: textParts.join("\n"), html };
}

