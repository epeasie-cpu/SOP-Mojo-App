import { createHash } from "node:crypto";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID } from "./site";

/** Tag applied on the existing Mojo Business Solutions LLC audience. Not a new list. */
export const CHECKOUT_LEAD_TAG = "checkout";

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

export async function captureCheckoutLead(input: {
  email: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, reason: "email" };
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const hash = mailchimpSubscriberHash(email);
    const listId = encodeURIComponent(settings.audienceId);
    const member = await mailchimpFetch(
      settings,
      `/lists/${listId}/members/${hash}`,
      {
        method: "PUT",
        body: JSON.stringify({ email_address: email, status_if_new: "subscribed" }),
      },
      fetchImpl,
    );
    if (!member.ok) return { ok: false, reason: "member" };
    const tagged = await mailchimpFetch(
      settings,
      `/lists/${listId}/members/${hash}/tags`,
      {
        method: "POST",
        body: JSON.stringify({ tags: [{ name: CHECKOUT_LEAD_TAG, status: "active" }] }),
      },
      fetchImpl,
    );
    if (!tagged.ok) return { ok: false, reason: "tag" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}
