import type { FlowGraph } from "./graph";
import {
  deleteFlowchartMap,
  flowchartPurpose,
  getFlowchartMap,
  isFlowchartMapId,
  listFlowchartMaps,
  newFlowchartMapId,
  upsertFlowchartMap,
  type FlowchartMapRecord,
  type FlowchartMapSummary,
} from "./flowchart-maps";
import { ensureFreshSession, supabasePublicConfig, type ClientSession } from "./session";

function requireConfig() {
  const config = supabasePublicConfig();
  if (!config) {
    throw new Error(
      "Map save uses the Builder Supabase project. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return config;
}

export async function saveLibraryMap(
  session: ClientSession,
  graph: FlowGraph,
  id?: string | null,
): Promise<FlowchartMapRecord> {
  const fresh = await ensureFreshSession(session);
  const config = requireConfig();
  const mapId = id && isFlowchartMapId(id) ? id : newFlowchartMapId();
  return upsertFlowchartMap({
    supabaseUrl: config.url,
    anonKey: config.anonKey,
    accessToken: fresh.accessToken,
    userId: fresh.userId,
    id: mapId,
    graph,
  });
}

export async function listLibraryMaps(session: ClientSession): Promise<FlowchartMapSummary[]> {
  const fresh = await ensureFreshSession(session);
  const config = requireConfig();
  return listFlowchartMaps({
    supabaseUrl: config.url,
    anonKey: config.anonKey,
    accessToken: fresh.accessToken,
  });
}

export async function loadLibraryMap(session: ClientSession, id: string): Promise<FlowchartMapRecord> {
  const fresh = await ensureFreshSession(session);
  const config = requireConfig();
  const map = await getFlowchartMap({
    supabaseUrl: config.url,
    anonKey: config.anonKey,
    accessToken: fresh.accessToken,
    id,
  });
  if (!map) throw new Error("That map was not found.");
  return map;
}

export async function deleteRemoteMap(session: ClientSession, id: string): Promise<void> {
  const fresh = await ensureFreshSession(session);
  const config = requireConfig();
  await deleteFlowchartMap({
    supabaseUrl: config.url,
    anonKey: config.anonKey,
    accessToken: fresh.accessToken,
    id,
  });
}

export { flowchartPurpose };
