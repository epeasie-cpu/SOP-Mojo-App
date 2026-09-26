import { deliverWriterSop, EMAIL_SEND_ERROR } from "@/lib/email-sop";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  try {
    const result = await deliverWriterSop({ body, env: process.env });
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: EMAIL_SEND_ERROR }, { status: 500 });
  }
}
