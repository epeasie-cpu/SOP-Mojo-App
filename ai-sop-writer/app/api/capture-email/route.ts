import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const processName =
    typeof record.processName === "string" ? record.processName.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }
  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  const line =
    JSON.stringify({
      email,
      processName,
      at: new Date().toISOString(),
    }) + "\n";
  await appendFile(path.join(dir, "email-log.jsonl"), line, "utf8");
  return Response.json({ ok: true });
}
