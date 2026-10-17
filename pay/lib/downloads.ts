import { createHash, randomBytes } from "node:crypto";
import type { Product } from "./catalog";
import type { EventStore } from "./event-store";
import { readAdminConfig, sendResendEmail } from "./fulfillment";
import { BLUEPRINT_FILENAME, BLUEPRINT_PRODUCT_ID, BLUEPRINT_STORAGE_PATH } from "./library";
import { absoluteUrl } from "./site";
import { stripeClient } from "./stripe-client";
import { normalizeEmail } from "./stripe-events";
import { stripeCredentials, type StripeMode } from "./stripe-mode";
import { signedDeliverableUrl } from "./deliverables";

export const DOWNLOAD_MAX = 10;
export const DOWNLOAD_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const BLUEPRINT_UPSELL = "Put the Blueprint to work: build your SOPs in Builder Pro. $39/mo";
export const BLUEPRINT_UPSELL_URL = "https://pay.sopmojo.com/go/builder_pro";
export const BLUEPRINT_EMAILED_NOTE = "We also emailed your download link.";
export const DOWNLOAD_RESEND_MESSAGE =
  "If that email has a purchase, a fresh download link is on its way. Check your junk and spam folder too.";

const RESEND_LIMIT = 5;
const RESEND_WINDOW_MS = 10 * 60 * 1000;
const resendHits = new Map<string, number[]>();

export function resetDownloadResendLimit(): void {
  resendHits.clear();
}

export function downloadResendLimited(ip: string, now = Date.now()): boolean {
  const key = ip.trim() || "unknown";
  const recent = (resendHits.get(key) ?? []).filter((at) => now - at < RESEND_WINDOW_MS);
  if (recent.length >= RESEND_LIMIT) {
    resendHits.set(key, recent);
    return true;
  }
  recent.push(now);
  resendHits.set(key, recent);
  return false;
}

export type DownloadGrant = {
  id: string;
  tokenHash: string;
  email: string;
  productId: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  downloadCount: number;
  maxDownloads: number;
  revokedAt: string | null;
};

export type GrantStore = {
  insert(grant: DownloadGrant): Promise<boolean>;
  findByHash(tokenHash: string): Promise<DownloadGrant | null>;
  findBySession(sessionId: string): Promise<DownloadGrant | null>;
  findPaidSession(email: string, productId: string): Promise<string | null>;
  compareAndIncrement(id: string, expectedCount: number): Promise<boolean>;
  replaceToken(sessionId: string, tokenHash: string, expiresAt: string): Promise<boolean>;
  revokeBySession(sessionId: string): Promise<void>;
  deleteBySession(sessionId: string): Promise<void>;
  hasPaidGrant(email: string, productId: string): Promise<boolean>;
};

export function newDownloadToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDownloadToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function downloadSendKey(email: string, eventId: string): string {
  return `${email.trim().toLowerCase()}|${eventId.trim()}|download`;
}

export function downloadUrl(token: string, env?: NodeJS.ProcessEnv): string {
  return absoluteUrl(`/download/${token}`, env);
}

export function memoryGrantStore(): GrantStore {
  const rows: DownloadGrant[] = [];
  return {
    async insert(grant) {
      if (rows.some((row) => row.sessionId === grant.sessionId || row.tokenHash === grant.tokenHash)) return false;
      rows.push({ ...grant });
      return true;
    },
    async findByHash(tokenHash) {
      return rows.find((row) => row.tokenHash === tokenHash) ?? null;
    },
    async findBySession(sessionId) {
      return rows.find((row) => row.sessionId === sessionId) ?? null;
    },
    async findPaidSession(email, productId) {
      const normalized = email.trim().toLowerCase();
      const matches = rows
        .filter((row) => row.email === normalized && row.productId === productId && !row.revokedAt)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return matches[0]?.sessionId ?? null;
    },
    async compareAndIncrement(id, expectedCount) {
      const row = rows.find((item) => item.id === id);
      if (!row || row.downloadCount !== expectedCount) return false;
      row.downloadCount += 1;
      return true;
    },
    async replaceToken(sessionId, tokenHash, expiresAt) {
      const row = rows.find((item) => item.sessionId === sessionId && !item.revokedAt);
      if (!row) return false;
      row.tokenHash = tokenHash;
      row.expiresAt = expiresAt;
      row.downloadCount = 0;
      return true;
    },
    async revokeBySession(sessionId) {
      const now = new Date().toISOString();
      for (const row of rows) {
        if (row.sessionId === sessionId && !row.revokedAt) row.revokedAt = now;
      }
    },
    async deleteBySession(sessionId) {
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (rows[index]?.sessionId === sessionId) rows.splice(index, 1);
      }
    },
    async hasPaidGrant(email, productId) {
      const normalized = email.trim().toLowerCase();
      return rows.some((row) => row.email === normalized && row.productId === productId && !row.revokedAt);
    },
  };
}

function adminHeaders(key: string, prefer: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

function rowFromApi(value: unknown): DownloadGrant | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.token_hash !== "string") return null;
  return {
    id: row.id,
    tokenHash: row.token_hash,
    email: String(row.email ?? ""),
    productId: String(row.product_id ?? ""),
    sessionId: String(row.session_id ?? ""),
    createdAt: String(row.created_at ?? ""),
    expiresAt: String(row.expires_at ?? ""),
    downloadCount: Number(row.download_count ?? 0),
    maxDownloads: Number(row.max_downloads ?? DOWNLOAD_MAX),
    revokedAt: typeof row.revoked_at === "string" ? row.revoked_at : null,
  };
}

export function supabaseGrantStore(input: {
  url: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
}): GrantStore {
  const fetchImpl = input.fetchImpl ?? fetch;
  const endpoint = `${input.url}/rest/v1/pay_download_grants`;
  return {
    async insert(grant) {
      const response = await fetchImpl(`${endpoint}?on_conflict=session_id`, {
        method: "POST",
        headers: adminHeaders(input.serviceRoleKey, "resolution=ignore-duplicates,return=representation"),
        body: JSON.stringify({
          id: grant.id,
          token_hash: grant.tokenHash,
          email: grant.email,
          product_id: grant.productId,
          session_id: grant.sessionId,
          created_at: grant.createdAt,
          expires_at: grant.expiresAt,
          download_count: grant.downloadCount,
          max_downloads: grant.maxDownloads,
          revoked_at: grant.revokedAt,
        }),
      });
      if (response.status === 409) return false;
      if (!response.ok) throw new Error(`Could not store the download grant (${response.status}).`);
      const rows = (await response.json().catch(() => [])) as unknown;
      return Array.isArray(rows) && rows.length > 0;
    },
    async findByHash(tokenHash) {
      const response = await fetchImpl(`${endpoint}?token_hash=eq.${encodeURIComponent(tokenHash)}&select=*`, {
        headers: adminHeaders(input.serviceRoleKey, "return=representation"),
      });
      if (!response.ok) throw new Error(`Could not read the download grant (${response.status}).`);
      const rows = (await response.json()) as unknown[];
      return rowFromApi(rows[0]);
    },
    async findBySession(sessionId) {
      const response = await fetchImpl(`${endpoint}?session_id=eq.${encodeURIComponent(sessionId)}&select=*`, {
        headers: adminHeaders(input.serviceRoleKey, "return=representation"),
      });
      if (!response.ok) throw new Error(`Could not read the download grant (${response.status}).`);
      const rows = (await response.json()) as unknown[];
      return rowFromApi(rows[0]);
    },
    async findPaidSession(email, productId) {
      const normalized = email.trim().toLowerCase();
      const response = await fetchImpl(
        `${endpoint}?email=eq.${encodeURIComponent(normalized)}&product_id=eq.${encodeURIComponent(productId)}&revoked_at=is.null&order=created_at.desc&limit=1&select=*`,
        { headers: adminHeaders(input.serviceRoleKey, "return=representation") },
      );
      if (!response.ok) throw new Error(`Could not look up the download (${response.status}).`);
      const rows = (await response.json()) as unknown[];
      return rowFromApi(rows[0])?.sessionId ?? null;
    },
    async compareAndIncrement(id, expectedCount) {
      const response = await fetchImpl(
        `${endpoint}?id=eq.${encodeURIComponent(id)}&download_count=eq.${expectedCount}`,
        {
          method: "PATCH",
          headers: adminHeaders(input.serviceRoleKey, "return=representation"),
          body: JSON.stringify({ download_count: expectedCount + 1 }),
        },
      );
      if (!response.ok) throw new Error(`Could not count the download (${response.status}).`);
      const rows = (await response.json().catch(() => [])) as unknown[];
      return Array.isArray(rows) && rows.length > 0;
    },
    async replaceToken(sessionId, tokenHash, expiresAt) {
      const response = await fetchImpl(
        `${endpoint}?session_id=eq.${encodeURIComponent(sessionId)}&revoked_at=is.null`,
        {
          method: "PATCH",
          headers: adminHeaders(input.serviceRoleKey, "return=representation"),
          body: JSON.stringify({ token_hash: tokenHash, expires_at: expiresAt, download_count: 0 }),
        },
      );
      if (!response.ok) throw new Error(`Could not refresh the download grant (${response.status}).`);
      const rows = (await response.json().catch(() => [])) as unknown[];
      return Array.isArray(rows) && rows.length > 0;
    },
    async revokeBySession(sessionId) {
      const response = await fetchImpl(`${endpoint}?session_id=eq.${encodeURIComponent(sessionId)}&revoked_at=is.null`, {
        method: "PATCH",
        headers: adminHeaders(input.serviceRoleKey, "return=minimal"),
        body: JSON.stringify({ revoked_at: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error(`Could not revoke the download (${response.status}).`);
    },
    async deleteBySession(sessionId) {
      const response = await fetchImpl(`${endpoint}?session_id=eq.${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        headers: adminHeaders(input.serviceRoleKey, "return=minimal"),
      });
      if (!response.ok) throw new Error(`Could not remove the download grant (${response.status}).`);
    },
    async hasPaidGrant(email, productId) {
      const normalized = email.trim().toLowerCase();
      const response = await fetchImpl(
        `${endpoint}?email=eq.${encodeURIComponent(normalized)}&product_id=eq.${encodeURIComponent(productId)}&revoked_at=is.null&select=id&limit=1`,
        { headers: adminHeaders(input.serviceRoleKey, "return=representation") },
      );
      if (!response.ok) throw new Error(`Could not look up the download (${response.status}).`);
      const rows = (await response.json()) as unknown[];
      return Array.isArray(rows) && rows.length > 0;
    },
  };
}

export function createGrantStore(env: NodeJS.ProcessEnv = process.env, fetchImpl?: typeof fetch): GrantStore {
  const admin = readAdminConfig(env);
  if (!admin) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to deliver the PDF.");
  return supabaseGrantStore({ ...admin, fetchImpl });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function blueprintDownloadEmail(input: { url: string }): { subject: string; text: string; html: string } {
  const url = input.url.trim();
  return {
    subject: "Your Business OS Blueprint download",
    text: [
      "Your Business OS Blueprint is ready.",
      "",
      `Download: ${url}`,
      "",
      "Check your junk and spam folder too.",
      "",
      BLUEPRINT_UPSELL,
      BLUEPRINT_UPSELL_URL,
    ].join("\n"),
    html: [
      "<p>Your Business OS Blueprint is ready.</p>",
      `<p><a href="${escapeHtml(url)}">Download the Blueprint</a></p>`,
      "<p>Check your junk and spam folder too.</p>",
      `<p><a href="${BLUEPRINT_UPSELL_URL}">${escapeHtml(BLUEPRINT_UPSELL)}</a></p>`,
    ].join(""),
  };
}

export function downloadRecoveryHtml(posted: boolean): string {
  const note = posted ? `<p>${escapeHtml(DOWNLOAD_RESEND_MESSAGE)}</p>` : "";
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Download link | SOP Mojo</title>
<body style="margin:0;background:#09090b;color:#f4f4f5;font-family:sans-serif">
<main style="max-width:32rem;margin:4rem auto;padding:0 1rem">
  <h1>This download link is no longer active.</h1>
  <p>Request a fresh link for The Business OS Blueprint. It is emailed only when that address has a paid download.</p>
  ${note}
  <form method="post">
    <input type="hidden" name="product" value="${BLUEPRINT_PRODUCT_ID}">
    <label>Email<br><input name="email" type="email" required autocomplete="email" style="min-height:3rem;width:100%;margin:0.5rem 0 1rem"></label>
    <button type="submit" style="min-height:3.5rem;width:100%;background:#b0ff56;color:#10140c;font-weight:600;border:0">Resend my link</button>
  </form>
</main>
</body>
</html>`;
}

function grantTiming(now: number): { createdAt: string; expiresAt: string } {
  return {
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DOWNLOAD_TTL_MS).toISOString(),
  };
}

/** Stripe replaces the whole metadata map, so keep every existing key. */
export async function rememberDownloadToken(input: {
  sessionId: string;
  token: string;
  env: NodeJS.ProcessEnv;
  mode: StripeMode;
}): Promise<void> {
  const creds = stripeCredentials(input.env, input.mode);
  if (!creds.secretKey) throw new Error("Stripe secret is not set, so the download link cannot be stored.");
  const stripe = stripeClient(creds.secretKey);
  const session = await stripe.checkout.sessions.retrieve(input.sessionId);
  await stripe.checkout.sessions.update(input.sessionId, {
    metadata: { ...(session.metadata ?? {}), download_token: input.token },
  });
}

export async function loadStoredDownloadToken(input: {
  sessionId: string;
  env: NodeJS.ProcessEnv;
  mode: StripeMode;
}): Promise<string | null> {
  const creds = stripeCredentials(input.env, input.mode);
  if (!creds.secretKey) return null;
  const session = await stripeClient(creds.secretKey).checkout.sessions.retrieve(input.sessionId);
  const token = session.metadata?.download_token?.trim() ?? "";
  return token || null;
}

async function issueToken(input: {
  email: string;
  productId: string;
  sessionId: string;
  grants: GrantStore;
  now: number;
  saveToken: (token: string) => Promise<void>;
  loadToken: () => Promise<string | null>;
}): Promise<string> {
  const token = newDownloadToken();
  const timing = grantTiming(input.now);
  const created = await input.grants.insert({
    id: crypto.randomUUID(),
    tokenHash: hashDownloadToken(token),
    email: input.email,
    productId: input.productId,
    sessionId: input.sessionId,
    createdAt: timing.createdAt,
    expiresAt: timing.expiresAt,
    downloadCount: 0,
    maxDownloads: DOWNLOAD_MAX,
    revokedAt: null,
  });
  if (created) {
    try {
      await input.saveToken(token);
    } catch (error) {
      await input.grants.deleteBySession(input.sessionId);
      throw error;
    }
    return token;
  }
  const loaded = await input.loadToken();
  if (!loaded) throw new Error("Download link is still being stored.");
  return loaded;
}

/** Create the grant if this Checkout Session does not have one yet. Does not send email. */
export async function ensureDownloadGrant(input: {
  email: string;
  product: Product;
  sessionId: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  grants?: GrantStore;
  now?: number;
  stripeMode?: StripeMode;
  saveToken?: (token: string) => Promise<void>;
  loadToken?: () => Promise<string | null>;
}): Promise<string> {
  if (input.product.delivery?.kind !== "secure_file") throw new Error("This product has no secure download.");
  const email = input.email.trim().toLowerCase();
  const sessionId = input.sessionId.trim();
  if (!email || !sessionId.startsWith("cs_")) throw new Error("Checkout session id is required.");
  const grants = input.grants ?? createGrantStore(input.env, input.fetchImpl);
  const mode = input.stripeMode ?? "test";
  const saveToken =
    input.saveToken ?? ((token: string) => rememberDownloadToken({ sessionId, token, env: input.env, mode }));
  const loadToken = input.loadToken ?? (() => loadStoredDownloadToken({ sessionId, env: input.env, mode }));
  return issueToken({
    email,
    productId: input.product.id,
    sessionId,
    grants,
    now: input.now ?? Date.now(),
    saveToken,
    loadToken,
  });
}

/** Create one grant for the Checkout Session and email the link once per Stripe event. */
export async function fulfillSecureDownload(input: {
  email: string;
  eventId: string;
  product: Product;
  sessionId: string;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  store: EventStore;
  grants?: GrantStore;
  now?: number;
  stripeMode?: StripeMode;
  saveToken?: (token: string) => Promise<void>;
  loadToken?: () => Promise<string | null>;
}): Promise<"sent" | "skipped"> {
  if (input.product.billing !== "once" || input.product.delivery?.kind !== "secure_file") return "skipped";
  const email = input.email.trim().toLowerCase();
  const token = await ensureDownloadGrant(input);
  const key = downloadSendKey(email, input.eventId);
  const claimed = await input.store.claimCredentialSend(key);
  if (!claimed) return "skipped";
  try {
    const content = blueprintDownloadEmail({ url: downloadUrl(token, input.env) });
    const sent = await sendResendEmail({
      email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      env: input.env,
      fetchImpl: input.fetchImpl,
    });
    if (!sent) throw new Error("Set RESEND_API_KEY so the buyer receives the download link.");
    return "sent";
  } catch (error) {
    await input.store.releaseCredentialSend(key);
    throw error;
  }
}

export type DownloadDecision =
  | { ok: true; storagePath: string; filename: string }
  | { ok: false; reason: "missing" | "expired" | "used" | "revoked" };

export async function consumeDownload(input: {
  token: string;
  grants: GrantStore;
  now?: number;
}): Promise<DownloadDecision> {
  const token = input.token.trim();
  if (!token) return { ok: false, reason: "missing" };
  const grant = await input.grants.findByHash(hashDownloadToken(token));
  if (!grant) return { ok: false, reason: "missing" };
  if (grant.revokedAt) return { ok: false, reason: "revoked" };
  const now = input.now ?? Date.now();
  if (Date.parse(grant.expiresAt) <= now) return { ok: false, reason: "expired" };
  if (grant.downloadCount >= grant.maxDownloads) return { ok: false, reason: "used" };
  if (grant.productId !== BLUEPRINT_PRODUCT_ID) return { ok: false, reason: "missing" };
  const counted = await input.grants.compareAndIncrement(grant.id, grant.downloadCount);
  if (!counted) return { ok: false, reason: "used" };
  return { ok: true, storagePath: BLUEPRINT_STORAGE_PATH, filename: BLUEPRINT_FILENAME };
}

export async function openDownload(input: {
  token: string;
  grants: GrantStore;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<{ redirect: string } | { unavailable: true }> {
  const decision = await consumeDownload(input);
  if (!decision.ok) return { unavailable: true };
  const redirect = await signedDeliverableUrl({
    storagePath: decision.storagePath,
    filename: decision.filename,
    env: input.env,
    fetchImpl: input.fetchImpl,
  });
  return { redirect };
}

export async function resendDownloadLink(input: {
  email: string;
  productId: string;
  ip: string;
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  grants?: GrantStore;
  now?: number;
}): Promise<void> {
  if (downloadResendLimited(input.ip, input.now)) return;
  const email = normalizeEmail(input.email);
  const productId = input.productId.trim();
  if (!email || productId !== BLUEPRINT_PRODUCT_ID) return;
  const grants = input.grants ?? createGrantStore(input.env, input.fetchImpl);
  const sessionId = await grants.findPaidSession(email, productId);
  if (!sessionId) return;
  const token = newDownloadToken();
  const content = blueprintDownloadEmail({ url: downloadUrl(token, input.env) });
  const sent = await sendResendEmail({
    email,
    subject: content.subject,
    text: content.text,
    html: content.html,
    env: input.env,
    fetchImpl: input.fetchImpl,
  });
  if (!sent) return;
  await grants.replaceToken(sessionId, hashDownloadToken(token), new Date((input.now ?? Date.now()) + DOWNLOAD_TTL_MS).toISOString());
}
