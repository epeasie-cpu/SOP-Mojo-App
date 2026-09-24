import { corsHeaders } from "@/lib/handoff";
import {
  deleteLibraryMap,
  getLibraryMap,
  libraryFailure,
  libraryJson,
  readGraphBody,
  requireLibraryAccount,
  upsertLibraryMap,
} from "@/lib/library-http";

const METHODS = "GET, PUT, DELETE, OPTIONS";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
}

async function idFrom(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return id;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireLibraryAccount(request);
  if ("response" in auth) return auth.response;
  try {
    const map = await getLibraryMap(auth.account.userId, await idFrom(context));
    if (!map) return libraryJson(request, { error: "That map was not found." }, 404, METHODS);
    return libraryJson(request, { map }, 200, METHODS);
  } catch (error) {
    return libraryFailure(request, error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireLibraryAccount(request);
  if ("response" in auth) return auth.response;
  const parsed = await readGraphBody(request);
  if ("response" in parsed) return parsed.response;
  try {
    const map = await upsertLibraryMap(auth.account.userId, parsed.graph, await idFrom(context));
    return libraryJson(request, { map }, 200, METHODS);
  } catch (error) {
    return libraryFailure(request, error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireLibraryAccount(request);
  if ("response" in auth) return auth.response;
  try {
    const removed = await deleteLibraryMap(auth.account.userId, await idFrom(context));
    if (!removed) return libraryJson(request, { error: "That map was not found." }, 404, METHODS);
    return new Response(null, { status: 204, headers: corsHeaders(request, METHODS) });
  } catch (error) {
    return libraryFailure(request, error);
  }
}
