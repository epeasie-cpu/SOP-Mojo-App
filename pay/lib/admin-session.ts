import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { DEFAULT_ADMIN_EMAIL } from "./site";

export const ADMIN_COOKIE = "pay_admin";

export function adminEmails(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.ADMIN_EMAILS?.trim() || DEFAULT_ADMIN_EMAIL;
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.includes("@"));
}

export function signingKey(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.ADMIN_SESSION_SECRET?.trim() || env.ADMIN_ACCESS_CODE?.trim();
  return secret || null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function accessCodeMatches(input: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const expected = env.ADMIN_ACCESS_CODE?.trim() ?? "";
  if (!expected || !input) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

function signPayload(payload: string, env: NodeJS.ProcessEnv): string {
  const key = signingKey(env);
  if (!key) throw new Error("Set ADMIN_ACCESS_CODE or ADMIN_SESSION_SECRET before signing in.");
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function readPayload(token: string, env: NodeJS.ProcessEnv): Record<string, unknown> | null {
  const key = signingKey(env);
  if (!key || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", key).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function signSession(email: string, env: NodeJS.ProcessEnv = process.env, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), exp: now + 1000 * 60 * 60 * 24 * 30, purpose: "session" }),
  ).toString("base64url");
  return signPayload(payload, env);
}

export function readSession(
  token: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): { email: string } | null {
  if (!token) return null;
  const row = readPayload(token, env);
  if (!row || row.purpose !== "session") return null;
  if (typeof row.exp !== "number" || row.exp < now) return null;
  if (typeof row.email !== "string") return null;
  const email = row.email.toLowerCase();
  if (!adminEmails(env).includes(email)) return null;
  return { email };
}

export function signMagicLink(email: string, env: NodeJS.ProcessEnv = process.env, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), exp: now + 1000 * 60 * 30, purpose: "magic" }),
  ).toString("base64url");
  return signPayload(payload, env);
}

export function readMagicLink(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): { email: string } | null {
  const row = readPayload(token, env);
  if (!row || row.purpose !== "magic") return null;
  if (typeof row.exp !== "number" || row.exp < now) return null;
  if (typeof row.email !== "string") return null;
  const email = row.email.toLowerCase();
  if (!adminEmails(env).includes(email)) return null;
  return { email };
}
