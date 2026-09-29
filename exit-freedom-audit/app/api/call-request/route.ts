import { CALL_SEND_ERROR, handleCallRequest } from "@/lib/call-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }
  try {
    const result = await handleCallRequest({ body, env: process.env });
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json({ ok: false, error: CALL_SEND_ERROR }, { status: 500 });
  }
}
