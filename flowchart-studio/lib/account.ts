export type Account = {
  userId: string;
  email?: string;
};

export type AccountResult =
  | { ok: true; account: Account }
  | { ok: false; status: number; error: string; code: string };

export function devAuthEnabled(): boolean {
  return process.env.FLOWCHART_AUTH_DEV === "1" || process.env.NODE_ENV !== "production";
}

export function supabaseServerConfig(): { url: string; anonKey: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

function fail(status: number, error: string, code: string): AccountResult {
  return { ok: false, status, error, code };
}

/** Resolve the shared Builder Supabase user from an Authorization header. */
export async function accountFromAuthorization(
  header: string | null | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<AccountResult> {
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  if (!token) return fail(401, "Sign in required.", "auth_required");

  if (token.startsWith("dev:")) {
    if (!devAuthEnabled()) return fail(401, "Sign in required.", "auth_required");
    const userId = token.slice(4).trim();
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(userId)) {
      return fail(401, "Sign in required.", "auth_required");
    }
    return { ok: true, account: { userId, email: `${userId}@local.dev` } };
  }

  const config = supabaseServerConfig();
  if (!config) {
    return fail(503, "Shared Builder auth is not configured.", "auth_unconfigured");
  }

  let response: Response;
  try {
    response = await fetchImpl(`${config.url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.anonKey,
      },
    });
  } catch {
    return fail(401, "Sign in required.", "auth_required");
  }
  if (!response.ok) return fail(401, "Sign in required.", "auth_required");

  let body: { id?: unknown; email?: unknown };
  try {
    body = (await response.json()) as { id?: unknown; email?: unknown };
  } catch {
    return fail(401, "Sign in required.", "auth_required");
  }
  if (typeof body.id !== "string" || !body.id) {
    return fail(401, "Sign in required.", "auth_required");
  }
  return {
    ok: true,
    account: {
      userId: body.id,
      email: typeof body.email === "string" ? body.email : undefined,
    },
  };
}

export async function accountFromRequest(request: Request): Promise<AccountResult> {
  return accountFromAuthorization(request.headers.get("authorization"));
}
