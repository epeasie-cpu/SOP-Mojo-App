import { deliverableExists } from "./deliverables";
import {
  createGrantStore,
  downloadUrl,
  founderTrapDownloadEmail,
  issueFreeDownloadGrant,
  type GrantStore,
} from "./downloads";
import { createEventStore, type EventStore } from "./event-store";
import { sendResendEmail } from "./fulfillment";
import { FOUNDER_TRAP_PRODUCT_ID, FOUNDER_TRAP_STORAGE_PATH } from "./library";
import { captureFreeFounderTrapLead } from "./mailchimp";
import { normalizeBuyerEmail } from "./open-checkout";

export const FOUNDER_TRAP_READY_PATH = "/escape-the-founder-trap/ready";

export const FOUNDER_TRAP_COMING_SOON = "Coming soon";

export const FOUNDER_TRAP_SUBMIT = "Send me the free guide";

export const FOUNDER_TRAP_SPAM = "Check your junk and spam folder too.";

export const FOUNDER_TRAP_EMAILED = "We emailed your download link.";

export const FOUNDER_TRAP_RATE_LIMIT = 5;

export const FOUNDER_TRAP_RATE_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

export function resetFounderTrapRateLimit(): void {
  hits.clear();
}

export function founderTrapClaimKey(email: string): string {
  return `${email.trim().toLowerCase()}|founder-trap-free`;
}

export function founderTrapRateLimited(ip: string, now = Date.now()): boolean {
  const key = ip.trim() || "unknown";
  const recent = (hits.get(key) ?? []).filter((at) => now - at < FOUNDER_TRAP_RATE_WINDOW_MS);
  if (recent.length >= FOUNDER_TRAP_RATE_LIMIT) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function founderTrapDownloadToken(value: string | undefined): string | null {
  const token = value?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return token;
}

export type FounderTrapResult =
  | { ok: true; downloadToken: string | null }
  | { ok: false; code: "email" | "rate" | "soon" | "send" };

function cleanName(value: string): string {
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
}

export function founderTrapErrorMessage(code: string | undefined): string | null {
  if (code === "email") return "Enter a valid email.";
  if (code === "rate") return "Too many requests. Try again in a few minutes.";
  if (code === "soon") return "Coming soon.";
  if (code === "send") return "We could not send your download link. Try again in a minute.";
  return null;
}

/**
 * Honeypot, rate limit, Mailchimp tags, one download grant per email, then Resend.
 * A filled honeypot looks successful and calls nothing. Mailchimp failures do not block the email.
 */
export async function submitFreeFounderTrap(input: {
  email: string;
  name: string;
  company: string;
  ip: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  store?: EventStore;
  grants?: GrantStore;
  now?: number;
  fileReady?: boolean;
}): Promise<FounderTrapResult> {
  if (input.company.trim()) return { ok: true, downloadToken: null };
  const email = normalizeBuyerEmail(input.email);
  if (!email) return { ok: false, code: "email" };
  const fetchImpl = input.fetchImpl ?? fetch;
  const ready =
    input.fileReady ??
    (await deliverableExists({
      storagePath: FOUNDER_TRAP_STORAGE_PATH,
      env: input.env,
      fetchImpl,
      now: input.now,
    }));
  if (!ready) return { ok: false, code: "soon" };
  if (founderTrapRateLimited(input.ip, input.now ?? Date.now())) return { ok: false, code: "rate" };

  const name = cleanName(input.name);
  await captureFreeFounderTrapLead({ email, name, env: input.env, fetchImpl });

  let grants: GrantStore;
  try {
    grants = input.grants ?? createGrantStore(input.env, fetchImpl);
  } catch {
    return { ok: false, code: "send" };
  }

  const store = input.store ?? createEventStore(input.env);
  const claim = founderTrapClaimKey(email);
  const claimed = await store.claimCredentialSend(claim);
  if (!claimed) return { ok: true, downloadToken: null };
  let issued: { token: string; sessionId: string };
  try {
    issued = await issueFreeDownloadGrant({
      email,
      productId: FOUNDER_TRAP_PRODUCT_ID,
      grants,
      now: input.now,
    });
  } catch {
    await store.releaseCredentialSend(claim);
    return { ok: false, code: "send" };
  }

  try {
    const content = founderTrapDownloadEmail({ url: downloadUrl(issued.token, input.env), to: email, env: input.env });
    const sent = await sendResendEmail({
      email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      env: input.env,
      fetchImpl,
      marketing: true,
      explicitRequest: true,
      store,
    });
    if (!sent) throw new Error("Set RESEND_API_KEY so the buyer receives the download link.");
    return { ok: true, downloadToken: issued.token };
  } catch {
    await grants.deleteBySession(issued.sessionId);
    await store.releaseCredentialSend(claim);
    return { ok: false, code: "send" };
  }
}
