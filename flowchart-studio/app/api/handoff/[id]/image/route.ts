import { corsHeaders, getHandoff } from "@/lib/handoff";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const headers = corsHeaders(request);
  const record = await getHandoff(id);
  if (!record?.imageBase64) {
    return Response.json({ error: "No preview image for this handoff." }, { status: 404, headers });
  }
  const bytes = Buffer.from(record.imageBase64, "base64");
  return new Response(bytes, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `inline; filename="${record.title.replace(/[^a-z0-9]+/gi, "-")}-flowchart.png"`,
    },
  });
}
