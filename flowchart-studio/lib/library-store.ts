import { LIBRARY_PATHS } from "./builder-bridge";
import { coerceGraph, newId, type FlowGraph } from "./graph";
import type { LibraryMap, LibrarySummary } from "./library-types";
import { SITE } from "./site";

export class LibraryError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Row = {
  id: string;
  userId: string;
  title: string;
  graph: FlowGraph;
  createdAt: string;
  updatedAt: string;
};

const memory = new Map<string, Row>();

export function resetLibraryMemory(): void {
  memory.clear();
}

export function libraryStorageMode(): "supabase" | "memory" | "unconfigured" {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (url && key) return "supabase";
  if (process.env.NODE_ENV === "production") return "unconfigured";
  return "memory";
}

function assertStorage() {
  const mode = libraryStorageMode();
  if (mode === "unconfigured") {
    throw new LibraryError(
      "Flowchart library storage is not configured.",
      503,
      "library_unconfigured",
    );
  }
  return mode;
}

export function isLibraryId(id: string): boolean {
  return /^map_[A-Za-z0-9_-]{4,80}$/.test(id);
}

function absolute(path: string): string {
  return `${SITE.host}${path}`;
}

export function toLibraryMap(row: Row): LibraryMap {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    graph: row.graph,
    pdfUrl: absolute(LIBRARY_PATHS.pdf(row.id)),
    url: absolute(LIBRARY_PATHS.map(row.id)),
  };
}

export function toLibrarySummary(row: Row): LibrarySummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    nodeCount: row.graph.nodes.length,
    pdfUrl: absolute(LIBRARY_PATHS.pdf(row.id)),
    url: absolute(LIBRARY_PATHS.map(row.id)),
  };
}

function normalizeGraph(graph: FlowGraph): FlowGraph {
  const coerced = coerceGraph(graph);
  const title = coerced.title.trim() || "Untitled process";
  return { ...coerced, title };
}

function supabaseConfig(): { url: string; key: string } {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new LibraryError(
      "Flowchart library storage is not configured.",
      503,
      "library_unconfigured",
    );
  }
  return { url, key };
}

async function supabaseFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new LibraryError("Could not reach the flowchart library.", 502, "library_upstream");
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

function rowFromSupabase(value: unknown): Row | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || typeof rec.user_id !== "string") return null;
  try {
    const graph = normalizeGraph(coerceGraph(rec.graph));
    return {
      id: rec.id,
      userId: rec.user_id,
      title: typeof rec.title === "string" ? rec.title : graph.title,
      graph,
      createdAt: typeof rec.created_at === "string" ? rec.created_at : new Date().toISOString(),
      updatedAt: typeof rec.updated_at === "string" ? rec.updated_at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function userFilter(userId: string): string {
  return encodeURIComponent(userId);
}

async function listSupabase(userId: string): Promise<Row[]> {
  const data = await supabaseFetch(
    `flowchart_maps?user_id=eq.${userFilter(userId)}&select=*&order=updated_at.desc`,
  );
  const rows = Array.isArray(data) ? data : [];
  return rows.flatMap((item) => {
    const row = rowFromSupabase(item);
    return row ? [row] : [];
  });
}

async function getSupabase(userId: string, id: string): Promise<Row | null> {
  const data = await supabaseFetch(
    `flowchart_maps?id=eq.${encodeURIComponent(id)}&user_id=eq.${userFilter(userId)}&select=*&limit=1`,
  );
  const rows = Array.isArray(data) ? data : [];
  return rows.length ? rowFromSupabase(rows[0]) : null;
}

function memoryList(userId: string): Row[] {
  return [...memory.values()]
    .filter((row) => row.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function memoryGet(userId: string, id: string): Row | null {
  const row = memory.get(id);
  if (!row || row.userId !== userId) return null;
  return row;
}

export async function listLibraryMaps(userId: string): Promise<LibrarySummary[]> {
  const mode = assertStorage();
  const rows = mode === "supabase" ? await listSupabase(userId) : memoryList(userId);
  return rows.map(toLibrarySummary);
}

export async function getLibraryMap(userId: string, id: string): Promise<LibraryMap | null> {
  if (!isLibraryId(id)) return null;
  const mode = assertStorage();
  const row = mode === "supabase" ? await getSupabase(userId, id) : memoryGet(userId, id);
  return row ? toLibraryMap(row) : null;
}

export async function upsertLibraryMap(
  userId: string,
  graph: FlowGraph,
  requestedId?: string,
): Promise<LibraryMap> {
  const mode = assertStorage();
  const nextGraph = normalizeGraph(graph);
  const now = new Date().toISOString();
  const id = requestedId && isLibraryId(requestedId) ? requestedId : newId("map");

  if (mode === "memory") {
    const existing = memory.get(id);
    if (existing && existing.userId !== userId) {
      throw new LibraryError("That map was not found.", 404, "not_found");
    }
    const row: Row = {
      id,
      userId,
      title: nextGraph.title,
      graph: nextGraph,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    memory.set(id, row);
    return toLibraryMap(row);
  }

  const existing = await getSupabase(userId, id);
  const ownedByOther = !existing && (await supabaseIdTaken(id));
  if (ownedByOther) throw new LibraryError("That map was not found.", 404, "not_found");

  const payload = {
    id,
    user_id: userId,
    title: nextGraph.title,
    graph: nextGraph,
    created_at: existing?.createdAt ?? now,
    updated_at: now,
  };
  if (existing) {
    const updated = await supabaseFetch(
      `flowchart_maps?id=eq.${encodeURIComponent(id)}&user_id=eq.${userFilter(userId)}`,
      { method: "PATCH", body: JSON.stringify({ title: payload.title, graph: payload.graph, updated_at: now }) },
    );
    const row = rowFromSupabase(Array.isArray(updated) ? updated[0] : updated);
    if (!row) throw new LibraryError("Could not save the map.", 502, "library_upstream");
    return toLibraryMap(row);
  }
  const created = await supabaseFetch("flowchart_maps", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const row = rowFromSupabase(Array.isArray(created) ? created[0] : created);
  if (!row) throw new LibraryError("Could not save the map.", 502, "library_upstream");
  return toLibraryMap(row);
}

async function supabaseIdTaken(id: string): Promise<boolean> {
  const data = await supabaseFetch(
    `flowchart_maps?id=eq.${encodeURIComponent(id)}&select=id&limit=1`,
  );
  return Array.isArray(data) && data.length > 0;
}

export async function deleteLibraryMap(userId: string, id: string): Promise<boolean> {
  if (!isLibraryId(id)) return false;
  const mode = assertStorage();
  if (mode === "memory") {
    const row = memory.get(id);
    if (!row || row.userId !== userId) return false;
    memory.delete(id);
    return true;
  }
  const existing = await getSupabase(userId, id);
  if (!existing) return false;
  await supabaseFetch(
    `flowchart_maps?id=eq.${encodeURIComponent(id)}&user_id=eq.${userFilter(userId)}`,
    { method: "DELETE" },
  );
  return true;
}
