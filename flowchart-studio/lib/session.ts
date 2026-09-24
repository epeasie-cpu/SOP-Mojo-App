export const SESSION_STORAGE_KEY = "flowchart-studio-session";
export const LIBRARY_ID_KEY = "flowchart-studio-library-id";

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

export function readLibraryId(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(LIBRARY_ID_KEY);
  return id && /^map_[A-Za-z0-9_-]{4,80}$/.test(id) ? id : null;
}

export function readLibraryIdSnapshot(): string | null {
  return readLibraryId();
}

export function writeLibraryId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id && /^map_[A-Za-z0-9_-]{4,80}$/.test(id)) {
    window.localStorage.setItem(LIBRARY_ID_KEY, id);
  } else {
    window.localStorage.removeItem(LIBRARY_ID_KEY);
  }
  emit();
}

export function supabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

function sessionFromAuth(body: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
}): ClientSession {
  if (!body.access_token || !body.user?.id) {
    throw new Error("Builder did not return a session. Confirm the email if this account is new.");
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
      "Sign-in uses the Builder Pro Supabase project. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
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
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { id?: string; email?: string };
    error_description?: string;
    msg?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(body.error_description || body.msg || body.message || "Could not sign in.");
  }
  const session = sessionFromAuth(body);
  persistSession(session);
  return session;
}

export function signInWithBuilder(email: string, password: string): Promise<ClientSession> {
  return authPost("/auth/v1/token?grant_type=password", { email, password });
}

export function signUpWithBuilder(email: string, password: string): Promise<ClientSession> {
  return authPost("/auth/v1/signup", { email, password });
}

export async function ensureFreshSession(session: ClientSession): Promise<ClientSession> {
  if (!session.expiresAt || session.expiresAt - Date.now() > 30_000) return session;
  if (!session.refreshToken || !supabasePublicConfig()) return session;
  return authPost("/auth/v1/token?grant_type=refresh_token", {
    refresh_token: session.refreshToken,
  });
}

export function authHeader(session: ClientSession): HeadersInit {
  return {
    Authorization: `Bearer ${session.accessToken}`,
    "Content-Type": "application/json",
  };
}
