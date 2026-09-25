import {
  BuilderRequestError,
  parseAttachResult,
  parseSopList,
  parseStepList,
  type BuilderAttachBody,
  type BuilderAttachResult,
  type BuilderSopSummary,
  type BuilderStepSummary,
} from "./builder-client";
import { currentQaUnlock } from "./entitlement-state";

function gatedHeaders(token: string, json = false): HeadersInit {
  const unlock = currentQaUnlock();
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(unlock ? { "x-flowchart-qa-unlock": unlock } : {}),
  };
}

async function readOk(response: Response, expected: string): Promise<unknown> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new BuilderRequestError(
      data.error || data.message || "Builder request failed.",
      data.code,
      expected,
    );
  }
  return data;
}

export async function listGatedBuilderSops(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BuilderSopSummary[]> {
  const response = await fetchImpl("/api/studio/sops", { headers: gatedHeaders(token) });
  return parseSopList(await readOk(response, "GET /api/studio/sops"));
}

export async function listGatedBuilderSteps(
  token: string,
  sopId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BuilderStepSummary[]> {
  const url = `/api/studio/sops/${encodeURIComponent(sopId)}/steps`;
  const response = await fetchImpl(url, { headers: gatedHeaders(token) });
  return parseStepList(await readOk(response, `GET ${url}`));
}

export async function attachGatedFlowchart(
  token: string,
  body: BuilderAttachBody,
  fetchImpl: typeof fetch = fetch,
): Promise<BuilderAttachResult> {
  const response = await fetchImpl("/api/studio/attach", {
    method: "POST",
    headers: gatedHeaders(token, true),
    body: JSON.stringify(body),
  });
  return parseAttachResult(await readOk(response, "POST /api/studio/attach"));
}
