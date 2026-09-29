import { handleShare, SHARE_SEND_ERROR } from "@/lib/share";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Missing score summary." }, { status: 400 });
  }
  try {
    const result = await handleShare({ body, env: process.env });
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ ok: false, error: SHARE_SEND_ERROR }, { status: 500 });
  }
}
