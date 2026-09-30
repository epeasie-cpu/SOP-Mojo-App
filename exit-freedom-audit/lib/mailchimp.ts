import { createHash } from "node:crypto";
import type { Goal } from "./questions";

/** Mojo Business Solutions LLC audience. Override with MAILCHIMP_AUDIENCE_ID. */
export const DEFAULT_MAILCHIMP_AUDIENCE_ID = "7c2226f741";

export const AUDIT_TAG = "audit";

export type MailchimpSettings = {
  apiKey: string;
  server: string;
  audienceId: string;
};

export type CaptureResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  tags?: string[];
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

export function auditTagsForGoal(goal: Goal): string[] {
  return [AUDIT_TAG, `audit_${goal}`];
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

/**
 * Email-only upsert. Applies every tag in one members/{hash}/tags call.
 * Does not use a signed-in Bearer token.
 */
export async function tagAudienceMember(input: {
  email: string;
  tags: string[];
  settings: MailchimpSettings;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const email = input.email.trim().toLowerCase();
  const tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
  if (!email.includes("@")) return { ok: false, reason: "email" };
  if (tags.length === 0) return { ok: false, reason: "tag" };
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    for (const tag of tags) {
      await ensureAudienceTag({ settings: input.settings, tag, fetchImpl });
    }
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
    if (!member.ok) return { ok: false, reason: "member", tags };
    const tagged = await mailchimpFetch(
      input.settings,
      `/lists/${listId}/members/${hash}/tags`,
      {
        method: "POST",
        body: JSON.stringify({
          tags: tags.map((name) => ({ name, status: "active" })),
        }),
      },
      fetchImpl,
    );
    if (!tagged.ok) return { ok: false, reason: "tag", tags };
    return { ok: true, tags };
  } catch {
    return { ok: false, reason: "network", tags };
  }
}
