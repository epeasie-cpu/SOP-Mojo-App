import { BUILDER_STUDIO_PATHS } from "./builder-bridge";
import { builderStudioUrl } from "./builder-client";
import { resolveRequestEntitlements } from "./entitlement-admin";
import { canExportToBuilder } from "./entitlements";

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function proxyStudio(
  request: Request,
  upstreamPath: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const entitlements = await resolveRequestEntitlements(request, process.env, fetchImpl);
  if (!canExportToBuilder(entitlements)) {
    return json(
      {
        error: "Export to Builder Pro requires Builder Pro.",
        code: "builder_pro_required",
      },
      403,
    );
  }
  if (!entitlements.accessToken) {
    return json({ error: "Sign in required.", code: "auth_required" }, 401);
  }
  const upstream = await fetchImpl(builderStudioUrl(upstreamPath), {
    method: request.method,
    headers: {
      Authorization: `Bearer ${entitlements.accessToken}`,
      Accept: "application/json",
      ...(request.method === "GET" || request.method === "HEAD"
        ? {}
        : { "Content-Type": request.headers.get("content-type") || "application/json" }),
    },
    body:
      request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const STUDIO_PROXY_PATHS = BUILDER_STUDIO_PATHS;
