import { BUILDER_BRIDGE_CONTRACT, FLOWCHART_MAPS_TABLE } from "./builder-bridge";
import { coerceGraph, listableNodes, type FlowGraph } from "./graph";
import { SITE } from "./site";

export const FLOWCHART_MAP_COLUMNS = "id,user_id,title,purpose,graph,image_url,document";

const MAP_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFlowchartMapId(id: string): boolean {
  return MAP_ID.test(id);
}

export function newFlowchartMapId(): string {
  return crypto.randomUUID();
}

export function flowchartPurpose(graph: FlowGraph): string {
  const listed = listableNodes(graph);
  if (listed.length === 0) return `Imported from ${SITE.name}`;
  return `Process with ${listed.length} mapped step${listed.length === 1 ? "" : "s"} from ${SITE.name}.`;
}

export type FlowchartMapRecord = {
  id: string;
  userId: string;
  title: string;
  purpose: string | null;
  graph: FlowGraph;
  imageUrl: string | null;
  document: Record<string, unknown> | null;
};

export type FlowchartMapSummary = {
  id: string;
  title: string;
  purpose: string | null;
  nodeCount: number;
};

export type FlowchartMapWrite = {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  userId: string;
  id: string;
  graph: FlowGraph;
  imageUrl?: string | null;
  document?: Record<string, unknown> | null;
};

function restUrl(supabaseUrl: string, query = ""): string {
  return `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${FLOWCHART_MAPS_TABLE}${query}`;
}

function restHeaders(input: Pick<FlowchartMapWrite, "anonKey" | "accessToken">, prefer?: string): Headers {
  const headers = new Headers({
    apikey: input.anonKey,
    Authorization: `Bearer ${input.accessToken}`,
    Accept: "application/json",
  });
  if (prefer) headers.set("Prefer", prefer);
  return headers;
}

async function readError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
  return data.message || data.error || "Could not save the flowchart.";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseFlowchartMapRow(value: unknown): FlowchartMapRecord | null {
  const rec = asRecord(value);
  if (!rec || typeof rec.id !== "string" || typeof rec.user_id !== "string") return null;
  const graph = coerceGraph(rec.graph, typeof rec.title === "string" ? rec.title : undefined);
  const title = (typeof rec.title === "string" && rec.title.trim()) || graph.title;
  return {
    id: rec.id,
    userId: rec.user_id,
    title,
    purpose: typeof rec.purpose === "string" ? rec.purpose : null,
    graph: { ...graph, title },
    imageUrl: typeof rec.image_url === "string" ? rec.image_url : null,
    document: asRecord(rec.document),
  };
}

export function toSummary(row: FlowchartMapRecord): FlowchartMapSummary {
  return {
    id: row.id,
    title: row.title,
    purpose: row.purpose,
    nodeCount: row.graph.nodes.length,
  };
}

function writeBody(input: FlowchartMapWrite): Record<string, unknown> {
  const graph = coerceGraph(input.graph);
  const title = graph.title.trim() || "Untitled process";
  const normalized: FlowGraph = { ...graph, title };
  return {
    id: input.id,
    user_id: input.userId,
    title,
    purpose: flowchartPurpose(normalized),
    graph: { title, nodes: normalized.nodes, edges: normalized.edges },
    image_url: input.imageUrl ?? null,
    document: input.document ?? {
      source: "flowchart-studio",
      print: BUILDER_BRIDGE_CONTRACT.print,
    },
  };
}

/** Insert or update one map as the signed-in user. RLS requires user_id = auth.uid(). */
export async function upsertFlowchartMap(
  input: FlowchartMapWrite,
  fetchImpl: typeof fetch = fetch,
): Promise<FlowchartMapRecord> {
  if (!isFlowchartMapId(input.id)) {
    throw new Error("Flowchart id must be a UUID.");
  }
  const response = await fetchImpl(restUrl(input.supabaseUrl, "?on_conflict=id"), {
    method: "POST",
    headers: (() => {
      const headers = restHeaders(input, "resolution=merge-duplicates,return=representation");
      headers.set("Content-Type", "application/json");
      return headers;
    })(),
    body: JSON.stringify(writeBody(input)),
  });
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as unknown;
  const row = parseFlowchartMapRow(Array.isArray(data) ? data[0] : data);
  if (!row) throw new Error("Supabase did not return the saved flowchart.");
  return row;
}

export async function listFlowchartMaps(
  input: Pick<FlowchartMapWrite, "supabaseUrl" | "anonKey" | "accessToken">,
  fetchImpl: typeof fetch = fetch,
): Promise<FlowchartMapSummary[]> {
  const response = await fetchImpl(
    restUrl(input.supabaseUrl, `?select=${encodeURIComponent(FLOWCHART_MAP_COLUMNS)}`),
    { headers: restHeaders(input) },
  );
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const row = parseFlowchartMapRow(item);
    return row ? [toSummary(row)] : [];
  });
}

export async function getFlowchartMap(
  input: Pick<FlowchartMapWrite, "supabaseUrl" | "anonKey" | "accessToken"> & { id: string },
  fetchImpl: typeof fetch = fetch,
): Promise<FlowchartMapRecord | null> {
  const response = await fetchImpl(
    restUrl(
      input.supabaseUrl,
      `?id=eq.${encodeURIComponent(input.id)}&select=${encodeURIComponent(FLOWCHART_MAP_COLUMNS)}`,
    ),
    { headers: restHeaders(input) },
  );
  if (!response.ok) throw new Error(await readError(response));
  const data = (await response.json()) as unknown;
  const row = Array.isArray(data) ? data[0] : data;
  return parseFlowchartMapRow(row);
}

export async function deleteFlowchartMap(
  input: Pick<FlowchartMapWrite, "supabaseUrl" | "anonKey" | "accessToken"> & { id: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(
    restUrl(input.supabaseUrl, `?id=eq.${encodeURIComponent(input.id)}`),
    { method: "DELETE", headers: restHeaders(input, "return=minimal") },
  );
  if (!response.ok) throw new Error(await readError(response));
}
