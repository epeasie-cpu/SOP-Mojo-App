import { runGenerate } from "@/lib/pipeline";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const text = String(rec.text ?? rec.transcript ?? "").trim();
  if (!text) {
    return Response.json({ error: "Paste or speak a process first." }, { status: 400 });
  }
  const result = await runGenerate(text);
  return Response.json(result);
}
