import { corsHeaders, getHandoff } from "@/lib/handoff";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const headers = corsHeaders(request);
  const record = await getHandoff(id);
  if (!record) {
    return Response.json({ error: "Handoff expired. Send again from Flowchart Studio." }, { status: 404, headers });
  }
  return Response.json(record.json, {
    headers: {
      ...headers,
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `inline; filename="${record.title.replace(/[^a-z0-9]+/gi, "-")}-builder-import.json"`,
    },
  });
}
