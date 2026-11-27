import { createHash } from "node:crypto";
import { logMailchimpFailure } from "./delivery-log";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID } from "./site";

/** Tag applied on the existing Mojo Business Solutions LLC audience. Not a new list. */
export const CHECKOUT_LEAD_TAG = "checkout";

/** Free AUP gate only. Never paired with the checkout tag. */
export const AUP_FREE_LEAD_TAG = "aup-free";

/** Free Founder Trap guide. Never paired with the checkout tag. */
export const FOUNDER_TRAP_FREE_TAG = "founder-trap-free";

export const LEAD_MAGNET_TAG = "lead-magnet";

/** Quality System Fit Check. Never paired with the checkout tag. */
export const QMS_LEAD_TAG = "qms";

/** Quality Control Starter Pack. Added beside qms and lead-magnet. */
export const QC_PACK_TAG = "qc-pack";

/** 2027 SLP CPT kit. Added beside lead-magnet and therapy. */
export const CPT_KIT_TAG = "cpt-kit";

/** Pediatric therapy practices. Used by the CPT kit. */
export const THERAPY_LEAD_TAG = "therapy";

/** Preview QA addresses from LEAD_QA_EMAILS. Added beside the offer tags. */
export const LEAD_QA_TAG = "qa";

/** Article popup only. Measures that the signup came from the embed. */
export const POPUP_LEAD_TAG = "popup";

/** Granted product id → Mailchimp tag. Unknown ids are left untagged. */
const PRODUCT_LEAD_TAGS: Record<string, string> = {
  builder_pro: "builder-pro",
  flowchart_plus: "flowchart-plus",
  aup_generator: "aup-generator",
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

/** Free Founder Trap gate. Always the Mojo audience, with the two lead tags and never checkout. */
export async function captureFreeFounderTrapLead(input: {
  email: string;
  name?: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, reason: "email" };
  const fetchImpl = input.fetchImpl ?? fetch;
  const name = input.name?.trim() ?? "";
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
          ...(name ? { merge_fields: { FNAME: name } } : {}),
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
        body: JSON.stringify({
          tags: [
            { name: FOUNDER_TRAP_FREE_TAG, status: "active" },
            { name: LEAD_MAGNET_TAG, status: "active" },
          ],
        }),
      },
      fetchImpl,
    );
    if (!tagged.ok) return { ok: false, reason: "tag" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Quality System Fit Check. Always the Mojo audience, with `qms` and `lead-magnet`, never checkout. */
export async function captureFreeQmsLead(input: {
  email: string;
  name?: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, reason: "email" };
  const fetchImpl = input.fetchImpl ?? fetch;
  const name = input.name?.trim() ?? "";
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
          ...(name ? { merge_fields: { FNAME: name } } : {}),
        }),
      },
      fetchImpl,
    );
    if (!member.ok) {
      logMailchimpFailure({ source: "qms-check", step: "member", status: member.status, email });
      return { ok: false, reason: "member" };
    }
    const tagged = await mailchimpFetch(
      settings,
      `/lists/${listId}/members/${hash}/tags`,
      {
        method: "POST",
        body: JSON.stringify({
          tags: [
            { name: QMS_LEAD_TAG, status: "active" },
            { name: LEAD_MAGNET_TAG, status: "active" },
          ],
        }),
      },
      fetchImpl,
    );
    if (!tagged.ok) {
      logMailchimpFailure({ source: "qms-check", step: "tag", status: tagged.status, email });
      return { ok: false, reason: "tag" };
    }
    return { ok: true };
  } catch {
    logMailchimpFailure({ source: "qms-check", step: "network", email });
    return { ok: false, reason: "network" };
  }
}

/** Quality Control Starter Pack. Always the Mojo audience. Page tags omit `popup`. */
export async function captureQcPackLead(input: {
  email: string;
  name?: string;
  popup?: boolean;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, reason: "email" };
  const fetchImpl = input.fetchImpl ?? fetch;
  const name = input.name?.trim() ?? "";
  const source = input.popup ? "qc-pack-popup" : "qc-pack";
  const tags = [
    { name: QMS_LEAD_TAG, status: "active" as const },
    { name: LEAD_MAGNET_TAG, status: "active" as const },
    { name: QC_PACK_TAG, status: "active" as const },
    ...(input.popup ? [{ name: POPUP_LEAD_TAG, status: "active" as const }] : []),
  ];
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
          ...(name ? { merge_fields: { FNAME: name } } : {}),
        }),
      },
      fetchImpl,
    );
    if (!member.ok) {
      logMailchimpFailure({ source, step: "member", status: member.status, email });
      return { ok: false, reason: "member" };
    }
    const tagged = await mailchimpFetch(
      settings,
      `/lists/${listId}/members/${hash}/tags`,
      {
        method: "POST",
        body: JSON.stringify({ tags }),
      },
      fetchImpl,
    );
    if (!tagged.ok) {
      logMailchimpFailure({ source, step: "tag", status: tagged.status, email });
      return { ok: false, reason: "tag" };
    }
    return { ok: true };
  } catch {
    logMailchimpFailure({ source, step: "network", email });
    return { ok: false, reason: "network" };
  }
}

/** 2027 SLP CPT kit. Always the Mojo audience. Page tags omit `popup`. QA adds `qa`. */
export async function captureCptKitLead(input: {
  email: string;
  name?: string;
  popup?: boolean;
  qa?: boolean;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<CaptureResult> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, skipped: true, reason: "unconfigured" };
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, reason: "email" };
  const fetchImpl = input.fetchImpl ?? fetch;
  const name = input.name?.trim() ?? "";
  const source = input.popup ? "cpt-kit-popup" : "cpt-kit";
  const tags = [
    { name: CPT_KIT_TAG, status: "active" as const },
    { name: LEAD_MAGNET_TAG, status: "active" as const },
    { name: THERAPY_LEAD_TAG, status: "active" as const },
    ...(input.popup ? [{ name: POPUP_LEAD_TAG, status: "active" as const }] : []),
    ...(input.qa ? [{ name: LEAD_QA_TAG, status: "active" as const }] : []),
  ];
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
          ...(name ? { merge_fields: { FNAME: name } } : {}),
        }),
      },
      fetchImpl,
    );
    if (!member.ok) {
      logMailchimpFailure({ source, step: "member", status: member.status, email });
      return { ok: false, reason: "member" };
    }
    const tagged = await mailchimpFetch(
      settings,
      `/lists/${listId}/members/${hash}/tags`,
      {
        method: "POST",
        body: JSON.stringify({ tags }),
      },
      fetchImpl,
    );
    if (!tagged.ok) {
      logMailchimpFailure({ source, step: "tag", status: tagged.status, email });
      return { ok: false, reason: "tag" };
    }
    return { ok: true };
  } catch {
    logMailchimpFailure({ source, step: "network", email });
    return { ok: false, reason: "network" };
  }
}

/** Mark a member unsubscribed on the Mojo audience. Missing and archived members are fine. */
export async function unsubscribeMailchimpMember(input: {
  email: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; missing?: boolean }> {
  const settings = mailchimpSettings(input.env);
  if (!settings) return { ok: true, missing: true };
  const email = input.email.trim().toLowerCase();
  const fetchImpl = input.fetchImpl ?? fetch;
  const hash = mailchimpSubscriberHash(email);
  const listId = encodeURIComponent(DEFAULT_MAILCHIMP_AUDIENCE_ID);
  try {
    const response = await mailchimpFetch(
      settings,
      `/lists/${listId}/members/${hash}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "unsubscribed" }),
      },
      fetchImpl,
    );
    if (response.ok || response.status === 404) return { ok: true, missing: response.status === 404 };
    const detail = await response.text().catch(() => "");
    if (/compliance|archived|forgotten|cleaned/i.test(detail)) return { ok: true };
    logMailchimpFailure({ source: "unsubscribe", step: "member", status: response.status, email });
    return { ok: true };
  } catch {
    logMailchimpFailure({ source: "unsubscribe", step: "network", email });
    return { ok: true };
  }
}
