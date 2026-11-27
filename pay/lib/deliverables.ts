import { readAdminConfig } from "./fulfillment";

export const DELIVERABLES_BUCKET = "deliverables";

export const DELIVERABLE_MAX_BYTES = 25 * 1024 * 1024;

const EXISTS_TTL_MS = 15_000;

type ExistsHit = { at: number; exists: boolean };

const existsCache = new Map<string, ExistsHit>();

export function clearDeliverableCache(): void {
  existsCache.clear();
}

/** Object key inside the private bucket. A leading `deliverables/` segment is the bucket, not a folder. */
export function deliverableObjectKey(storagePath: string): string {
  const path = storagePath.trim().replace(/^\/+/, "");
  const prefix = `${DELIVERABLES_BUCKET}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

function encodeKey(key: string): string {
  return key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function deliverableUploadError(input: { name: string; type: string; size: number }): string | null {
  if (!input.name.toLowerCase().endsWith(".pdf") && input.type !== "application/pdf") return "Upload a PDF.";
  if (input.type && input.type !== "application/pdf" && input.type !== "application/octet-stream") return "Upload a PDF.";
  if (!Number.isFinite(input.size) || input.size < 5) return "That PDF is empty.";
  if (input.size > DELIVERABLE_MAX_BYTES) return "PDF must be 25MB or smaller.";
  return null;
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

async function ensureBucket(url: string, key: string, fetchImpl: typeof fetch): Promise<void> {
  const response = await fetchImpl(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: DELIVERABLES_BUCKET, name: DELIVERABLES_BUCKET, public: false }),
  });
  if (response.ok || response.status === 409) return;
  const text = await response.text();
  if (response.status === 400 && /already exists/i.test(text)) return;
  throw new Error(`Could not prepare the deliverables bucket (${response.status}).`);
}

export async function uploadDeliverable(input: {
  storagePath: string;
  bytes: Uint8Array;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const admin = readAdminConfig(input.env);
  if (!admin) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to store the PDF.");
  if (!isPdfBytes(input.bytes)) throw new Error("Upload a PDF.");
  if (input.bytes.byteLength > DELIVERABLE_MAX_BYTES) throw new Error("PDF must be 25MB or smaller.");
  const fetchImpl = input.fetchImpl ?? fetch;
  await ensureBucket(admin.url, admin.serviceRoleKey, fetchImpl);
  const key = encodeKey(deliverableObjectKey(input.storagePath));
  const payload = new Uint8Array(input.bytes.byteLength);
  payload.set(input.bytes);
  const response = await fetchImpl(`${admin.url}/storage/v1/object/${DELIVERABLES_BUCKET}/${key}`, {
    method: "POST",
    headers: {
      apikey: admin.serviceRoleKey,
      Authorization: `Bearer ${admin.serviceRoleKey}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: payload.buffer,
  });
  if (!response.ok) throw new Error(`Could not store the PDF (${response.status}).`);
  clearDeliverableCache();
}

/** True only when the private object exists. Missing config counts as not ready. Cached for 15 seconds. */
export async function deliverableExists(input: {
  storagePath: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<boolean> {
  const env = input.env ?? process.env;
  const admin = readAdminConfig(env);
  const cacheKey = `${admin?.url ?? "local"}|${input.storagePath}`;
  const now = input.now ?? Date.now();
  const hit = existsCache.get(cacheKey);
  if (hit && now - hit.at < EXISTS_TTL_MS) return hit.exists;
  let exists = false;
  if (admin) {
    const fetchImpl = input.fetchImpl ?? fetch;
    const key = encodeKey(deliverableObjectKey(input.storagePath));
    const response = await fetchImpl(`${admin.url}/storage/v1/object/${DELIVERABLES_BUCKET}/${key}`, {
      method: "HEAD",
      headers: {
        apikey: admin.serviceRoleKey,
        Authorization: `Bearer ${admin.serviceRoleKey}`,
      },
    });
    exists = response.ok;
  }
  existsCache.set(cacheKey, { at: now, exists });
  return exists;
}

export async function signedDeliverableUrl(input: {
  storagePath: string;
  filename: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const admin = readAdminConfig(input.env);
  if (!admin) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to sign the download.");
  const fetchImpl = input.fetchImpl ?? fetch;
  const key = encodeKey(deliverableObjectKey(input.storagePath));
  const response = await fetchImpl(`${admin.url}/storage/v1/object/sign/${DELIVERABLES_BUCKET}/${key}`, {
    method: "POST",
    headers: {
      apikey: admin.serviceRoleKey,
      Authorization: `Bearer ${admin.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  if (!response.ok) throw new Error(`Could not sign the download (${response.status}).`);
  const body = (await response.json().catch(() => null)) as { signedURL?: string; signedUrl?: string } | null;
  const signed = body?.signedURL || body?.signedUrl || "";
  if (!signed.startsWith("/object/sign/") && !signed.startsWith("http")) {
    throw new Error("Storage did not return a signed download.");
  }
  const absolute = signed.startsWith("http") ? signed : `${admin.url}/storage/v1${signed}`;
  const join = absolute.includes("?") ? "&" : "?";
  return `${absolute}${join}download=${encodeURIComponent(input.filename)}`;
}
