import { accountFromRequest } from "@/lib/account";
import { corsHeaders } from "@/lib/handoff";
import { coerceGraph } from "@/lib/graph";
import {
  deleteLibraryMap,
  getLibraryMap,
  LibraryError,
  listLibraryMaps,
  upsertLibraryMap,
} from "@/lib/library-store";
import { renderPrintPdf } from "@/lib/print-pdf";

const METHODS = "GET, POST, PUT, DELETE, OPTIONS";

export function libraryJson(request: Request, body: unknown, status = 200, methods = METHODS) {
  return Response.json(body, { status, headers: corsHeaders(request, methods) });
}

export async function requireLibraryAccount(request: Request) {
  const result = await accountFromRequest(request);
  if (!result.ok) {
    return {
      response: libraryJson(request, { error: result.error, code: result.code }, result.status),
    };
  }
  return { account: result.account };
}

export function libraryFailure(request: Request, error: unknown) {
  if (error instanceof LibraryError) {
    return libraryJson(request, { error: error.message, code: error.code }, error.status);
  }
  return libraryJson(request, { error: "Could not use the flowchart library." }, 500);
}

export async function readGraphBody(request: Request): Promise<
  { graph: ReturnType<typeof coerceGraph>; id?: string } | { response: Response }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: libraryJson(request, { error: "Invalid JSON." }, 400) };
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (!rec.graph || typeof rec.graph !== "object") {
    return { response: libraryJson(request, { error: "A flowchart is required." }, 400) };
  }
  return {
    graph: coerceGraph(rec.graph),
    id: typeof rec.id === "string" ? rec.id : undefined,
  };
}

export async function libraryPdfResponse(request: Request, id: string) {
  const auth = await requireLibraryAccount(request);
  if ("response" in auth) return auth.response;
  try {
    const map = await getLibraryMap(auth.account.userId, id);
    if (!map) return libraryJson(request, { error: "That map was not found." }, 404);
    const bytes = await renderPrintPdf(map.graph);
    const filename = `${map.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "flowchart"}-flowchart.pdf`;
    const headers = corsHeaders(request, "GET, OPTIONS");
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return libraryFailure(request, error);
  }
}

export { deleteLibraryMap, getLibraryMap, listLibraryMaps, upsertLibraryMap };
