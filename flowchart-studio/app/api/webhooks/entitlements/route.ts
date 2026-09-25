import { EntitlementAdminError, grantEntitlement } from "@/lib/entitlement-admin";
import { parseEntitlementWebhook } from "@/lib/entitlement-webhook";
import { presentedWebhookSecret, secretsMatch, webhookSecret } from "@/lib/webhook-secret";

export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret) {
    return Response.json(
      { error: "Entitlement webhook is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const presented = presentedWebhookSecret(request);
  if (!presented || !secretsMatch(presented, secret)) {
    return Response.json(
      { error: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = parseEntitlementWebhook(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await grantEntitlement(parsed.command);
    return Response.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof EntitlementAdminError ? error.status : 502;
    const message = error instanceof Error ? error.message : "Could not update entitlements.";
    return Response.json({ error: message }, { status });
  }
}
