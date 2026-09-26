export const SESSION_STORAGE_KEY = "ai-sop-writer-session";

export type ClientSession = {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  email?: string;
  expiresAt?: number;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let cacheRaw: string | null | undefined;
let cache: ClientSession | null = null;

function parseSession(raw: string | null): ClientSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ClientSession;
    if (!value?.accessToken || !value.userId) return null;
    return value;
  } catch {
    return null;
  }
}

export function readSessionSnapshot(): ClientSession | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = parseSession(raw);
  return cache;
}

export function serverSessionSnapshot(): ClientSession | null {
  return null;
}

export function persistSession(session: ClientSession): void {
  const raw = JSON.stringify(session);
  window.localStorage.setItem(SESSION_STORAGE_KEY, raw);
  cacheRaw = raw;
  cache = session;
  emit();
}

export function clearSession(): void {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  cacheRaw = null;
  cache = null;
  emit();
}

export function supabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

type AuthBody = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
  error_description?: string;
  msg?: string;
  message?: string;
};

export function sessionFromAuthBody(body: AuthBody): ClientSession {
  if (!body.access_token || !body.user?.id) {
    throw new Error(
      "Check your email to confirm this account, then sign in. Copy and download stay locked until then.",
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    userId: body.user.id,
    email: body.user.email,
    expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : undefined,
  };
}

async function authPost(path: string, payload: Record<string, string>): Promise<ClientSession> {
  const config = supabasePublicConfig();
  if (!config) {
    throw new Error(
      "This free account uses the shared Builder Supabase project. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  const response = await fetch(`${config.url}${path}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as AuthBody;
  if (!response.ok) {
    throw new Error(body.error_description || body.msg || body.message || "Could not sign in.");
  }
  const session = sessionFromAuthBody(body);
  persistSession(session);
  return session;
}

export function signInWithBuilder(email: string, password: string): Promise<ClientSession> {
  return authPost("/auth/v1/token?grant_type=password", { email, password });
}

export function signUpWithBuilder(email: string, password: string): Promise<ClientSession> {
  return authPost("/auth/v1/signup", { email, password });
}
