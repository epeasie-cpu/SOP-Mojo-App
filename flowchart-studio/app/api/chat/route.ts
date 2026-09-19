import { runChat } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const message = String(rec.message ?? rec.text ?? "").trim();
  if (!message) {
    return Response.json({ error: "Tell me what to change." }, { status: 400 });
  }
  try {
    const result = await runChat(rec.graph, message);
    return Response.json(result);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Chat edit failed.";
    return Response.json({ error: messageText }, { status: 400 });
  }
}
