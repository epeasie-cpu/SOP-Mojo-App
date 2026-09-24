import {
  ATTACH_PLACEMENT_OWN,
  ATTACH_PLACEMENT_STEP,
  BUILDER_STUDIO_PATHS,
} from "./builder-bridge";
import type { FlowGraph } from "./graph";
import { slugify } from "./graph";
import { SITE } from "./site";

/** UI sentinel for “Its Own Step”. The attach body uses placement `own` and stepId null. */
export const OWN_STEP_ID = "own";

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
  placement: typeof ATTACH_PLACEMENT_OWN | typeof ATTACH_PLACEMENT_STEP;
  stepId: string | null;
  flowchartId: string;
  title: string;
  purpose: string;
  graph: FlowGraph;
  pdfBase64: string;
  pdfFilename: string;
};

export type BuilderAttachResult = {
  stepId: string;
  placement: typeof ATTACH_PLACEMENT_OWN | typeof ATTACH_PLACEMENT_STEP;
  pdfUrl: string;
  printable: unknown;
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

export function builderStudioBase(): string {
  const override = process.env.NEXT_PUBLIC_BUILDER_ORIGIN?.trim();
  return (override || SITE.builder).replace(/\/$/, "");
}

export function builderStudioUrl(path: string): string {
  return `${builderStudioBase()}${path}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function rowsFrom(body: unknown, key: "sops" | "steps"): unknown[] {
  if (Array.isArray(body)) return body;
  const rec = asRecord(body);
  if (!rec) return [];
  const named = rec[key] ?? rec.items ?? rec.data;
  return Array.isArray(named) ? named : [];
}

function titleOf(rec: Record<string, unknown>): string | null {
  if (typeof rec.title === "string" && rec.title.trim()) return rec.title;
  if (typeof rec.name === "string" && rec.name.trim()) return rec.name;
  return null;
}

export function parseSopList(body: unknown): BuilderSopSummary[] {
  return rowsFrom(body, "sops").flatMap((item) => {
    const rec = asRecord(item);
    const title = rec ? titleOf(rec) : null;
    if (!rec || typeof rec.id !== "string" || !title) return [];
    const updatedAt = rec.updatedAt ?? rec.updated_at;
    return [
      {
        id: rec.id,
        title,
        updatedAt: typeof updatedAt === "string" ? updatedAt : undefined,
      },
    ];
  });
}

export function parseStepList(body: unknown): BuilderStepSummary[] {
  return rowsFrom(body, "steps").flatMap((item) => {
    const rec = asRecord(item);
    const title = rec ? titleOf(rec) : null;
    if (!rec || typeof rec.id !== "string" || !title) return [];
    const number = Number(rec.number ?? rec.position);
    return [
      {
        id: rec.id,
        title,
        number: Number.isFinite(number) ? number : undefined,
      },
    ];
  });
}

export function parseAttachResult(body: unknown): BuilderAttachResult {
  const rec = asRecord(body);
  const placement = rec?.placement === "own" || rec?.placement === "step" ? rec.placement : null;
  const stepId = typeof rec?.stepId === "string" ? rec.stepId : typeof rec?.step_id === "string" ? rec.step_id : null;
  const pdfUrl = typeof rec?.pdfUrl === "string" ? rec.pdfUrl : typeof rec?.pdf_url === "string" ? rec.pdf_url : null;
  if (!rec || !stepId || !placement || !pdfUrl) {
    throw new BuilderRequestError(
      "Builder attach response was missing stepId, placement, or pdfUrl.",
      "attach_response",
    );
  }
  return {
    stepId,
    placement,
    pdfUrl,
    printable: rec.printable ?? rec.printablePayload ?? rec.payload ?? rec.document ?? null,
  };
}

export function attachPayload(input: {
  sopId: string;
  stepId: string;
  flowchartId: string;
  title: string;
  purpose: string;
  graph: FlowGraph;
  pdfBase64: string;
}): BuilderAttachBody {
  const own = input.stepId === OWN_STEP_ID;
  return {
    sopId: input.sopId,
    placement: own ? ATTACH_PLACEMENT_OWN : ATTACH_PLACEMENT_STEP,
    stepId: own ? null : input.stepId,
    flowchartId: input.flowchartId,
    title: input.title,
    purpose: input.purpose,
    graph: input.graph,
    pdfBase64: input.pdfBase64,
    pdfFilename: `${slugify(input.title)}-flowchart.pdf`,
  };
}

export function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function throwIfNotOk(response: Response, expected: string): Promise<unknown> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    code?: string;
  };
  if (!response.ok) {
    const missing = response.status === 404 || response.status === 501;
    throw new BuilderRequestError(
      data.error || data.message || (missing
        ? "Builder has not published this Flowchart Studio endpoint yet."
        : "Builder request failed."),
      missing ? "builder_contract_missing" : data.code,
      expected,
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
  const url = builderStudioUrl(BUILDER_STUDIO_PATHS.sops);
  const response = await fetchImpl(url, { headers: authHeaders(token) });
  return parseSopList(await throwIfNotOk(response, `GET ${url}`));
}

export async function listBuilderSteps(
  token: string,
  sopId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BuilderStepSummary[]> {
  const url = builderStudioUrl(BUILDER_STUDIO_PATHS.steps(sopId));
  const response = await fetchImpl(url, { headers: authHeaders(token) });
  return parseStepList(await throwIfNotOk(response, `GET ${url}`));
}

export async function attachFlowchart(
  token: string,
  body: BuilderAttachBody,
  fetchImpl: typeof fetch = fetch,
): Promise<BuilderAttachResult> {
  const url = builderStudioUrl(BUILDER_STUDIO_PATHS.attach);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(body),
  });
  return parseAttachResult(await throwIfNotOk(response, `POST ${url}`));
}
