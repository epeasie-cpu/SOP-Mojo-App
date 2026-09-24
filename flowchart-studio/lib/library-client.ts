import type { FlowGraph } from "./graph";
import type { LibraryMap, LibrarySummary } from "./library-types";
import { authHeader, ensureFreshSession, type ClientSession } from "./session";

async function asJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "Library request failed.");
  return data as T;
}

export async function saveLibraryMap(
  session: ClientSession,
  graph: FlowGraph,
  id?: string | null,
): Promise<LibraryMap> {
  const fresh = await ensureFreshSession(session);
  const path = id ? `/api/library/${encodeURIComponent(id)}` : "/api/library";
  const response = await fetch(path, {
    method: id ? "PUT" : "POST",
    headers: authHeader(fresh),
    body: JSON.stringify({ graph, id: id ?? undefined }),
  });
  const data = await asJson<{ map: LibraryMap }>(response);
  return data.map;
}

export async function listLibraryMaps(session: ClientSession): Promise<LibrarySummary[]> {
  const fresh = await ensureFreshSession(session);
  const response = await fetch("/api/library", { headers: authHeader(fresh) });
  const data = await asJson<{ maps: LibrarySummary[] }>(response);
  return data.maps;
}

export async function loadLibraryMap(session: ClientSession, id: string): Promise<LibraryMap> {
  const fresh = await ensureFreshSession(session);
  const response = await fetch(`/api/library/${encodeURIComponent(id)}`, {
    headers: authHeader(fresh),
  });
  const data = await asJson<{ map: LibraryMap }>(response);
  return data.map;
}

export async function deleteRemoteMap(session: ClientSession, id: string): Promise<void> {
  const fresh = await ensureFreshSession(session);
  const response = await fetch(`/api/library/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeader(fresh),
  });
  if (!response.ok && response.status !== 204) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Could not delete that map.");
  }
}

export async function fetchLibraryPdf(session: ClientSession, id: string): Promise<Uint8Array> {
  const fresh = await ensureFreshSession(session);
  const response = await fetch(`/api/library/${encodeURIComponent(id)}/pdf`, {
    headers: { Authorization: `Bearer ${fresh.accessToken}` },
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Could not build the printable PDF.");
  }
  return new Uint8Array(await response.arrayBuffer());
}
