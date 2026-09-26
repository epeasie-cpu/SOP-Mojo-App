import { createHash } from "node:crypto";

/** Mojo Business Solutions LLC audience. Override with MAILCHIMP_AUDIENCE_ID. */
export const DEFAULT_MAILCHIMP_AUDIENCE_ID = "7c2226f741";

export const LEAD_TAGS = ["writer", "flowchart"] as const;
export type LeadTag = (typeof LEAD_TAGS)[number];

export type MailchimpSettings = {
  apiKey: string;
  server: string;
  audienceId: string;
};

export type CaptureResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
};

export function mailchimpSettings(env: NodeJS.ProcessEnv): MailchimpSettings | null {
  const apiKey = env.MAILCHIMP_API_KEY?.trim();
  if (!apiKey) return null;
  const server = apiKey.match(/-([a-z]{2}\d+)$/i)?.[1]?.toLowerCase();
  if (!server) return null;
  const audienceId = env.MAILCHIMP_AUDIENCE_ID?.trim() || DEFAULT_MAILCHIMP_AUDIENCE_ID;
  if (!audienceId) return null;
  return { apiKey, server, audienceId };
}

export function mailchimpSubscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`sopmojo:${apiKey}`).toString("base64")}`;
}

async function mailchimpFetch(
  settings: MailchimpSettings,
  path: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response> {
  return fetchImpl(`https://${settings.server}.api.mailchimp.com/3.0${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(settings.apiKey),
      "Content-Type": "application/json",
    },
  });
}

/** Mailchimp creates a tag on first apply. This also creates it up front when tag-search misses. */
export async function ensureAudienceTag(input: {
  settings: MailchimpSettings;
  tag: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const listId = encodeURIComponent(input.settings.audienceId);
  const query = new URLSearchParams({ name: input.tag });
  try {
    const search = await mailchimpFetch(
      input.settings,
      `/lists/${listId}/tag-search?${query.toString()}`,
      { method: "GET" },
      fetchImpl,
    );
    if (search.ok) {
      const body = (await search.json().catch(() => null)) as { tags?: { name?: string }[] } | null;
      const names = body?.tags?.map((tag) => tag.name?.toLowerCase()) ?? [];
      if (names.includes(input.tag.toLowerCase())) return true;
    }
    const created = await mailchimpFetch(
      input.settings,
      `/lists/${listId}/segments`,
      {
        method: "POST",
        body: JSON.stringify({ name: input.tag, static_segment: [] }),
      },
      fetchImpl,
    );
    return created.ok || created.status === 400;
  } catch {
    return false;
  }
}

export async function tagAudienceMember(input: {
  email: string;
  tag: LeadTag;
  settings: MailchimpSettings;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, reason: "email" };
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    await ensureAudienceTag({ settings: input.settings, tag: input.tag, fetchImpl });
    const hash = mailchimpSubscriberHash(email);
    const listId = encodeURIComponent(input.settings.audienceId);
    const member = await mailchimpFetch(
      input.settings,
      `/lists/${listId}/members/${hash}`,
      {
        method: "PUT",
        body: JSON.stringify({
          email_address: email,
          status_if_new: "subscribed",
        }),
      },
      fetchImpl,
    );
    if (!member.ok) return { ok: false, reason: "member" };
    const tagged = await mailchimpFetch(
      input.settings,
      `/lists/${listId}/members/${hash}/tags`,
      {
        method: "POST",
        body: JSON.stringify({ tags: [{ name: input.tag, status: "active" }] }),
      },
      fetchImpl,
    );
    if (!tagged.ok) return { ok: false, reason: "tag" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function emailFromSupabaseAccessToken(
  accessToken: string,
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const token = accessToken.trim();
  if (!url || !anonKey || !token || token.startsWith("dev:")) return null;
  try {
    const response = await fetchImpl(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;
    const body = (await response.json().catch(() => null)) as { email?: unknown } | null;
    return typeof body?.email === "string" && body.email.includes("@") ? body.email : null;
  } catch {
    return null;
  }
}

export async function captureSignedInLead(input: {
  accessToken: string;
  tag: LeadTag;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  const fetchImpl = input.fetchImpl ?? fetch;
  const email = await emailFromSupabaseAccessToken(input.accessToken, input.env, fetchImpl);
  if (!email) return { ok: true, skipped: true, reason: "no-email" };
  return tagAudienceMember({
    email,
    tag: input.tag,
    settings,
    fetchImpl,
  });
}

export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}
