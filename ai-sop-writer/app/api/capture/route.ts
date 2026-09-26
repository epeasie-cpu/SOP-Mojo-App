import { bearerToken, captureSignedInLead } from "@/lib/mailchimp";

export async function POST(request: Request) {
  try {
    const result = await captureSignedInLead({
      accessToken: bearerToken(request),
      tag: "writer",
      env: process.env,
    });
    return Response.json(result);
  } catch {
    return Response.json({ ok: false, skipped: true, reason: "error" });
  }
}
