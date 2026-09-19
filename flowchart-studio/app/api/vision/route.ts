import { runVision } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const image = String(rec.image ?? rec.dataUrl ?? "");
  if (!image) {
    return Response.json({ error: "Upload a photo of the handwritten scribble." }, { status: 400 });
  }
  try {
    const result = await runVision(image);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vision failed.";
    const status = message.includes("API_KEY") ? 503 : 400;
    return Response.json({ error: message }, { status });
  }
}
