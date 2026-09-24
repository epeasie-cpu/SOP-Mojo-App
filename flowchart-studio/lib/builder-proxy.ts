import { SITE } from "./site";

export function builderOrigin(): string {
  return (process.env.BUILDER_ORIGIN || SITE.builder).replace(/\/$/, "");
}

export function builderFlowchartUrl(path: string): string {
  return `${builderOrigin()}${path}`;
}

export async function proxyBuilder(
  request: Request,
  path: string,
  method: "GET" | "POST" = "GET",
  body?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return Response.json({ error: "Sign in required.", code: "auth_required" }, { status: 401 });
  }
  const url = builderFlowchartUrl(path);
  let upstream: Response;
  try {
    upstream = await fetchImpl(url, {
      method,
      headers: {
        Authorization: auth,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
    });
  } catch {
    return Response.json(
      {
        error: "Builder could not be reached.",
        code: "builder_unreachable",
        expected: `${method} ${url}`,
      },
      { status: 502 },
    );
  }

  if (upstream.status === 404 || upstream.status === 501) {
    return Response.json(
      {
        error: "Builder has not published this Flowchart Studio endpoint yet.",
        code: "builder_contract_missing",
        expected: `${method} ${url}`,
        upstreamStatus: upstream.status,
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
