import { handleCapture } from "@/lib/capture";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }
  try {
    const result = await handleCapture({ body, env: process.env });
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json(
      { ok: true, unlocked: true, mailchimp: { ok: false, reason: "error" } },
      { status: 200 },
    );
  }
}
