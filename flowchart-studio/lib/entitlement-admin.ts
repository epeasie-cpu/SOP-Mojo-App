import { randomBytes } from "node:crypto";
import {
  ENTITLEMENTS_TABLE,
  LOCKED_ENTITLEMENTS,
  qaUnlockEnabled,
  resolveEntitlements,
  type EntitlementFlags,
  type EntitlementSnapshot,
} from "./entitlements";
import type { EntitlementWebhookCommand, WebhookProduct } from "./entitlement-webhook";

export class EntitlementAdminError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "EntitlementAdminError";
    this.status = status;
  }
}

export type SupabasePublicConfig = { url: string; anonKey: string };
export type SupabaseAdminConfig = SupabasePublicConfig & { serviceRoleKey: string };

export function readSupabasePublicConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabasePublicConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

export function readSupabaseAdminConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseAdminConfig | null {
  const pub = readSupabasePublicConfig(env);
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!pub || !serviceRoleKey) return null;
  return { ...pub, serviceRoleKey };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function adminHeaders(serviceRoleKey: string, json = false): HeadersInit {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function errorText(response: Response): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    msg?: string;
    error_description?: string;
    error?: string;
  };
  return data.message || data.msg || data.error_description || data.error || `HTTP ${response.status}`;
}

function parseUserId(body: unknown): string | null {
  if (typeof body === "string" && body.trim()) return body.trim();
  const rec = asRecord(body);
  if (!rec) return null;
  if (typeof rec.id === "string" && rec.id) return rec.id;
  const user = asRecord(rec.user);
  if (user && typeof user.id === "string" && user.id) return user.id;
  return null;
}

function flagsFromRow(value: unknown): EntitlementFlags {
  const rec = asRecord(value);
  if (!rec) return { ...LOCKED_ENTITLEMENTS };
  return {
    flowchart_plus: rec.flowchart_plus === true,
    builder_pro: rec.builder_pro === true,
  };
}

export function bearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(\S+)\s*$/i);
  return match?.[1] ?? null;
}

export function qaUnlockFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("unlock") || request.headers.get("x-flowchart-qa-unlock");
}

export async function verifyAccessToken(
  config: SupabasePublicConfig,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; email?: string } | null> {
  const response = await fetchImpl(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as { id?: string; email?: string } | null;
  if (!body?.id) return null;
  return { id: body.id, email: body.email };
}

export async function readEntitlementFlags(
  config: SupabasePublicConfig,
  accessToken: string,
  userId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EntitlementFlags> {
  const url =
    `${config.url}/rest/v1/${ENTITLEMENTS_TABLE}` +
    `?user_id=eq.${encodeURIComponent(userId)}&select=flowchart_plus,builder_pro`;
  const response = await fetchImpl(url, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    console.error("entitlements read failed", response.status);
    return { ...LOCKED_ENTITLEMENTS };
  }
  const rows = (await response.json().catch(() => [])) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return { ...LOCKED_ENTITLEMENTS };
  return flagsFromRow(rows[0]);
}

export async function resolveRequestEntitlements(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<EntitlementSnapshot & { accessToken: string | null; userId: string | null }> {
  const unlock = qaUnlockFromRequest(request);
  const token = bearerToken(request);
  let account: EntitlementFlags = { ...LOCKED_ENTITLEMENTS };
  let userId: string | null = null;
  const pub = readSupabasePublicConfig(env);
  if (token && pub) {
    try {
      const user = await verifyAccessToken(pub, token, fetchImpl);
      if (user) {
        userId = user.id;
        account = await readEntitlementFlags(pub, token, user.id, fetchImpl);
      }
    } catch (error) {
      console.error("entitlements lookup failed", error instanceof Error ? error.message : error);
      account = { ...LOCKED_ENTITLEMENTS };
      userId = null;
    }
  }
  const flags = resolveEntitlements(account, unlock, qaUnlockEnabled(env));
  return { ...flags, accessToken: token, userId };
}

export async function lookupUserIdByEmail(
  config: SupabaseAdminConfig,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const response = await fetchImpl(`${config.url}/rest/v1/rpc/entitlement_user_id_by_email`, {
    method: "POST",
    headers: adminHeaders(config.serviceRoleKey, true),
    body: JSON.stringify({ target_email: email }),
  });
  if (!response.ok) {
    const detail = await errorText(response);
    throw new EntitlementAdminError(
      `Could not look up the user by email. Apply flowchart-studio/supabase/migrations/20260925_entitlements.sql on the shared Supabase project. ${detail}`,
      503,
    );
  }
  const body = await response.json().catch(() => null);
  return parseUserId(body);
}

export async function createConfirmedUser(
  config: SupabaseAdminConfig,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const password = randomBytes(24).toString("base64url");
  const response = await fetchImpl(`${config.url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(config.serviceRoleKey, true),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });
  if (response.status === 422) {
    await response.json().catch(() => null);
    return null;
  }
  if (!response.ok) {
    throw new EntitlementAdminError(`Could not create the Supabase user. ${await errorText(response)}`);
  }
  const id = parseUserId(await response.json().catch(() => null));
  if (!id) throw new EntitlementAdminError("Supabase created a user without an id.");
  return id;
}

export async function upsertEntitlementFlag(
  config: SupabaseAdminConfig,
  input: { userId: string; email: string; product: WebhookProduct; active: boolean },
  fetchImpl: typeof fetch = fetch,
): Promise<EntitlementFlags> {
  const response = await fetchImpl(
    `${config.url}/rest/v1/${ENTITLEMENTS_TABLE}?on_conflict=user_id`,
    {
      method: "POST",
      headers: {
        ...adminHeaders(config.serviceRoleKey, true),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: input.userId,
        email: input.email,
        [input.product]: input.active,
      }),
    },
  );
  if (!response.ok) {
    throw new EntitlementAdminError(`Could not save entitlements. ${await errorText(response)}`);
  }
  const body = await response.json().catch(() => null);
  const row = Array.isArray(body) ? body[0] : body;
  return flagsFromRow(row);
}

export async function grantEntitlement(
  command: EntitlementWebhookCommand,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{
  user_id: string;
  email: string;
  product: WebhookProduct;
  active: boolean;
  created_user: boolean;
  flowchart_plus: boolean;
  builder_pro: boolean;
}> {
  const admin = readSupabaseAdminConfig(env);
  if (!admin) {
    throw new EntitlementAdminError(
      "Set SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      503,
    );
  }
  let userId = await lookupUserIdByEmail(admin, command.email, fetchImpl);
  let created = false;
  if (!userId) {
    userId = await createConfirmedUser(admin, command.email, fetchImpl);
    created = Boolean(userId);
  }
  if (!userId) {
    userId = await lookupUserIdByEmail(admin, command.email, fetchImpl);
  }
  if (!userId) {
    throw new EntitlementAdminError("Could not match or create a Supabase user for that email.");
  }
  const flags = await upsertEntitlementFlag(
    admin,
    {
      userId,
      email: command.email,
      product: command.product,
      active: command.active,
    },
    fetchImpl,
  );
  return {
    user_id: userId,
    email: command.email,
    product: command.product,
    active: command.active,
    created_user: created,
    flowchart_plus: flags.flowchart_plus,
    builder_pro: flags.builder_pro,
  };
}
