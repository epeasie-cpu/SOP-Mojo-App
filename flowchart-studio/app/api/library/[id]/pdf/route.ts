import { corsHeaders } from "@/lib/handoff";
import { libraryPdfResponse } from "@/lib/library-http";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "GET, OPTIONS") });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return libraryPdfResponse(request, id);
}
