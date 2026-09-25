import { resolveRequestEntitlements } from "@/lib/entitlement-admin";
import { canPrintExport } from "@/lib/entitlements";
import { exportToBuilderV1 } from "@/lib/export-to-builder";
import { coerceGraph } from "@/lib/graph";
import { handoffUrls, parseDataUrlImage, putHandoff } from "@/lib/handoff";

export const maxDuration = 30;

export async function POST(request: Request) {
  const entitlements = await resolveRequestEntitlements(request);
  if (!canPrintExport(entitlements)) {
    return Response.json(
      {
        error: "Print and export require Flowchart Plus or Builder Pro.",
        code: "flowchart_plus_required",
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested = rec.package && typeof rec.package === "object" ? (rec.package as Record<string, unknown>) : null;
  const graphValue = rec.graph ?? nested?.flowchart;
  if (graphValue == null) {
    return Response.json({ error: "Handoff needs a flowchart." }, { status: 400 });
  }
  let graph;
  try {
    graph = coerceGraph(graphValue);
  } catch {
    return Response.json({ error: "Handoff needs a flowchart." }, { status: 400 });
  }

  const generatedAt = typeof rec.generatedAt === "string" ? rec.generatedAt : new Date().toISOString();
  const pkg = exportToBuilderV1(graph, generatedAt);
  if (typeof rec.title === "string" && rec.title.trim()) {
    pkg.title = rec.title.trim();
    pkg.flowchart = { ...pkg.flowchart, title: pkg.title };
  }

  const imageBase64 = parseDataUrlImage(typeof rec.image === "string" ? rec.image : undefined);
  const saved = await putHandoff({
    title: pkg.title,
    json: pkg,
    imageBase64,
  });
  const origin = new URL(request.url).origin;
  const urls = handoffUrls(origin, saved.id, Boolean(imageBase64));
  return Response.json({
    id: saved.id,
    title: saved.title,
    jsonUrl: urls.jsonUrl,
    imageUrl: urls.imageUrl,
    expiresInSec: 30 * 60,
  });
}
