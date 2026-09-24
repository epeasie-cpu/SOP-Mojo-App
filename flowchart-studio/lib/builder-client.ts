import {
  ATTACH_VIEW,
  EXISTING_STEP_PLACEMENT,
  OWN_STEP_PLACEMENT,
} from "./builder-bridge";
import { slugify } from "./graph";
import { SITE } from "./site";

export const OWN_STEP_ID = "own-step";

export type BuilderSopSummary = {
  id: string;
  title: string;
  updatedAt?: string;
};

export type BuilderStepSummary = {
  id: string;
  title: string;
  number?: number;
};

export type BuilderAttachBody = {
  sopId: string;
  placement: typeof OWN_STEP_PLACEMENT | typeof EXISTING_STEP_PLACEMENT;
  stepId: string | null;
  flowchartId: string;
  title: string;
  view: typeof ATTACH_VIEW;
  pdfBase64: string;
  pdfFilename: string;
  pdfUrl: string;
  libraryUrl: string;
};

export class BuilderRequestError extends Error {
  code?: string;
  expected?: string;

  constructor(message: string, code?: string, expected?: string) {
    super(message);
    this.name = "BuilderRequestError";
    this.code = code;
    this.expected = expected;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function rowsFrom(body: unknown, key: "sops" | "steps"): unknown[] {
  if (Array.isArray(body)) return body;
  const rec = asRecord(body);
  if (!rec) return [];
  const named = rec[key] ?? rec.items ?? rec.data;
  return Array.isArray(named) ? named : [];
}

export function parseSopList(body: unknown): BuilderSopSummary[] {
  return rowsFrom(body, "sops").flatMap((item) => {
    const rec = asRecord(item);
    if (!rec || typeof rec.id !== "string" || typeof rec.title !== "string") return [];
    return [
      {
        id: rec.id,
        title: rec.title,
        updatedAt: typeof rec.updatedAt === "string" ? rec.updatedAt : undefined,
      },
    ];
  });
}

export function parseStepList(body: unknown): BuilderStepSummary[] {
  return rowsFrom(body, "steps").flatMap((item) => {
    const rec = asRecord(item);
    if (!rec || typeof rec.id !== "string" || typeof rec.title !== "string") return [];
    const number = Number(rec.number);
    return [
      {
        id: rec.id,
        title: rec.title,
        number: Number.isFinite(number) ? number : undefined,
      },
    ];
  });
}

export function attachPayload(input: {
  sopId: string;
  stepId: string;
  flowchartId: string;
  title: string;
  pdfBase64: string;
}): BuilderAttachBody {
  const own = input.stepId === OWN_STEP_ID;
  return {
    sopId: input.sopId,
    placement: own ? OWN_STEP_PLACEMENT : EXISTING_STEP_PLACEMENT,
    stepId: own ? null : input.stepId,
    flowchartId: input.flowchartId,
    title: input.title,
    view: ATTACH_VIEW,
    pdfBase64: input.pdfBase64,
    pdfFilename: `${slugify(input.title)}-flowchart.pdf`,
    pdfUrl: `${SITE.host}/api/library/${encodeURIComponent(input.flowchartId)}/pdf`,
    libraryUrl: `${SITE.host}/api/library/${encodeURIComponent(input.flowchartId)}`,
  };
}

export function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function throwIfNotOk(response: Response): Promise<unknown> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    expected?: string;
  };
  if (!response.ok) {
    throw new BuilderRequestError(
      data.error || "Builder request failed.",
      data.code,
      data.expected,
    );
  }
  return data;
}

function authHeaders(token: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export async function listBuilderSops(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BuilderSopSummary[]> {
  const response = await fetchImpl("/api/builder/sops", { headers: authHeaders(token) });
  return parseSopList(await throwIfNotOk(response));
}

export async function listBuilderSteps(
  token: string,
  sopId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BuilderStepSummary[]> {
  const response = await fetchImpl(`/api/builder/sops/${encodeURIComponent(sopId)}/steps`, {
    headers: authHeaders(token),
  });
  return parseStepList(await throwIfNotOk(response));
}

export async function attachFlowchart(
  token: string,
  body: BuilderAttachBody,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl("/api/builder/attach", {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response);
}
