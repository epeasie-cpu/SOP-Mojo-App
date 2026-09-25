import { resolveRequestEntitlements } from "@/lib/entitlement-admin";
import { entitlementPayload } from "@/lib/entitlements";

export async function GET(request: Request) {
  const entitlements = await resolveRequestEntitlements(request);
  return Response.json(entitlementPayload(entitlements), {
    headers: { "Cache-Control": "no-store" },
  });
}
