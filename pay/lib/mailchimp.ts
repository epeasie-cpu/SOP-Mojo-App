import { createHash } from "node:crypto";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID } from "./site";

/** Tag applied on the existing Mojo Business Solutions LLC audience. Not a new list. */
export const CHECKOUT_LEAD_TAG = "checkout";

/** Free AUP gate only. Never paired with the checkout tag. */
export const AUP_FREE_LEAD_TAG = "aup-free";

/** Granted product id → Mailchimp tag. Unknown ids are left untagged. */
const PRODUCT_LEAD_TAGS: Record<string, string> = {
  builder_pro: "builder-pro",
  flowchart_plus: "flowchart-plus",
  aup_generator: "aup-generator",
  business_os_dashboard: "business-os-dashboard",
  business_os_blueprint: "business-os-blueprint",
  offers_guide: "offers-guide",
};

function checkoutLeadTags(products: readonly string[]): { name: string; status: "active" }[] {
  const tags: { name: string; status: "active" }[] = [{ name: CHECKOUT_LEAD_TAG, status: "active" }];
  const seen = new Set<string>();
  for (const id of products) {
    const name = PRODUCT_LEAD_TAGS[id];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    tags.push({ name, status: "active" });
  }
  return tags;
}

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
  products?: readonly string[];
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
        body: JSON.stringify({ tags: checkoutLeadTags(input.products ?? []) }),
      },
      fetchImpl,
    );
    if (!tagged.ok) return { ok: false, reason: "tag" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Free AUP gate. Always the Mojo audience, and only the aup-free tag. */
export async function captureFreeAupLead(input: {
  email: string;
  firstName?: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, reason: "email" };
  const fetchImpl = input.fetchImpl ?? fetch;
  const firstName = input.firstName?.trim() ?? "";
  try {
    const hash = mailchimpSubscriberHash(email);
    const listId = encodeURIComponent(DEFAULT_MAILCHIMP_AUDIENCE_ID);
    const member = await mailchimpFetch(
      settings,
      `/lists/${listId}/members/${hash}`,
      {
        method: "PUT",
        body: JSON.stringify({
          email_address: email,
          status_if_new: "subscribed",
          ...(firstName ? { merge_fields: { FNAME: firstName } } : {}),
        }),
      },
      fetchImpl,
    );
    if (!member.ok) return { ok: false, reason: "member" };
    const tagged = await mailchimpFetch(
      settings,
      `/lists/${listId}/members/${hash}/tags`,
      {
        method: "POST",
        body: JSON.stringify({ tags: [{ name: AUP_FREE_LEAD_TAG, status: "active" }] }),
      },
      fetchImpl,
    );
    if (!tagged.ok) return { ok: false, reason: "tag" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}
