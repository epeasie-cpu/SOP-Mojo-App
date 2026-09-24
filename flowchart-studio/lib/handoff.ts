import { newId } from "./graph";
import { SITE } from "./site";

export const HANDOFF_TTL_SEC = 30 * 60;
export const BUILDER_HANDOFF_ORIGIN = SITE.builder;

export type HandoffRecord = {
  id: string;
  title: string;
  json: unknown;
  imageBase64?: string;
  createdAt: string;
};

type Entry = { value: string; exp: number };

const memory = new Map<string, Entry>();

function memoryGet(key: string): string | undefined {
  const row = memory.get(key);
  if (!row) return undefined;
  if (row.exp <= Date.now()) {
    memory.delete(key);
    return undefined;
  }
  return row.value;
}

function memorySet(key: string, value: string, ttlSec: number) {
  memory.set(key, { value, exp: Date.now() + ttlSec * 1000 });
}

async function cacheGet(key: string): Promise<string | undefined> {
  try {
    const { getCache } = await import("@vercel/functions");
    const cached = await getCache({ namespace: "flowchart-handoff" }).get(key);
    if (typeof cached === "string") return cached;
    if (cached != null) return JSON.stringify(cached);
  } catch {
    // Local / tests fall through to memory.
  }
  return memoryGet(key);
}

async function cacheSet(key: string, value: string, ttlSec: number): Promise<void> {
  memorySet(key, value, ttlSec);
  try {
    const { getCache } = await import("@vercel/functions");
    await getCache({ namespace: "flowchart-handoff" }).set(key, value, {
      ttl: ttlSec,
      name: "builder-handoff",
    });
  } catch {
    // Local / tests: memory is enough.
  }
}

export function parseDataUrlImage(dataUrl: string | undefined): string | undefined {
  if (!dataUrl) return undefined;
  const match = dataUrl.match(/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return undefined;
  return match[1].replace(/\s+/g, "");
}

export async function putHandoff(record: Omit<HandoffRecord, "id" | "createdAt"> & { id?: string }): Promise<HandoffRecord> {
  const saved: HandoffRecord = {
    id: record.id || newId("h"),
    title: record.title,
    json: record.json,
    imageBase64: record.imageBase64,
    createdAt: new Date().toISOString(),
  };
  await cacheSet(saved.id, JSON.stringify(saved), HANDOFF_TTL_SEC);
  return saved;
}

export async function getHandoff(id: string): Promise<HandoffRecord | null> {
  const raw = (await cacheGet(id)) ?? memoryGet(id);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HandoffRecord;
    if (!parsed?.id || parsed.json == null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function handoffUrls(origin: string, id: string, hasImage: boolean) {
  const base = `${origin.replace(/\/$/, "")}/api/handoff/${encodeURIComponent(id)}`;
  return {
    jsonUrl: base,
    imageUrl: hasImage ? `${base}/image` : undefined,
  };
}

export function corsHeaders(request: Request, methods = "GET, OPTIONS"): HeadersInit {
  const origin = request.headers.get("origin");
  const allow =
    origin === BUILDER_HANDOFF_ORIGIN ||
    origin === "https://www.builder.sopmojo.com" ||
    (origin != null && /^https:\/\/[\w.-]+\.vercel\.app$/.test(origin) && origin.includes("builder")) ||
    (origin != null && /^http:\/\/localhost:\d+$/.test(origin))
      ? origin
      : BUILDER_HANDOFF_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
