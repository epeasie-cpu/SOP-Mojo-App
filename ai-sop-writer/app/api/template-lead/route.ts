import { deliverTemplateLead } from "@/lib/template-lead";
import { requestIp } from "@/lib/rate-limit";
import { sendWithResend } from "@/lib/email-sop";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  try {
    const result = await deliverTemplateLead({
      body,
      env: process.env,
      ip: requestIp(request),
      send: (message) => sendWithResend(message, process.env.RESEND_API_KEY),
    });
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: result.status });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "We couldn't send that template. Check the address and try again." },
      { status: 500 },
    );
  }
}
