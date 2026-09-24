import { corsHeaders } from "@/lib/handoff";
import {
  libraryFailure,
  libraryJson,
  listLibraryMaps,
  readGraphBody,
  requireLibraryAccount,
  upsertLibraryMap,
} from "@/lib/library-http";

const METHODS = "GET, POST, OPTIONS";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

export async function GET(request: Request) {
  const auth = await requireLibraryAccount(request);
  if ("response" in auth) return auth.response;
  try {
    const maps = await listLibraryMaps(auth.account.userId);
    return libraryJson(request, { maps }, 200, METHODS);
  } catch (error) {
    return libraryFailure(request, error);
  }
}

export async function POST(request: Request) {
  const auth = await requireLibraryAccount(request);
  if ("response" in auth) return auth.response;
  const parsed = await readGraphBody(request);
  if ("response" in parsed) return parsed.response;
  try {
    const map = await upsertLibraryMap(auth.account.userId, parsed.graph, parsed.id);
    return libraryJson(request, { map }, 200, METHODS);
  } catch (error) {
    return libraryFailure(request, error);
  }
}
