"use client";

import { useEffect, useState } from "react";
import {
  attachFlowchart,
  attachPayload,
  BuilderRequestError,
  listBuilderSops,
  listBuilderSteps,
  OWN_STEP_ID,
  uint8ToBase64,
  type BuilderAttachResult,
  type BuilderSopSummary,
  type BuilderStepSummary,
} from "@/lib/builder-client";
import { flowchartPurpose } from "@/lib/flowchart-maps";
import type { FlowGraph } from "@/lib/graph";
import { renderPrintPdf } from "@/lib/print-pdf";
import type { ClientSession } from "@/lib/session";

export function ExportWizard({
  open,
  session,
  flowchartId,
  graph,
  onClose,
}: {
  open: boolean;
  session: ClientSession | null;
  flowchartId: string | null;
  graph: FlowGraph;
  onClose: () => void;
}) {
  if (!open || !session) return null;
  return (
    <ExportWizardBody
      session={session}
      flowchartId={flowchartId}
      graph={graph}
      onClose={onClose}
    />
  );
}

function ExportWizardBody({
  session,
  flowchartId,
  graph,
  onClose,
}: {
  session: ClientSession;
  flowchartId: string | null;
  graph: FlowGraph;
  onClose: () => void;
}) {
  const [sops, setSops] = useState<BuilderSopSummary[]>([]);
  const [steps, setSteps] = useState<BuilderStepSummary[]>([]);
  const [sopId, setSopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BuilderAttachResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    listBuilderSops(session.accessToken)
      .then((rows) => {
        if (!cancelled) setSops(rows);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(messageFrom(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  async function chooseSop(id: string) {
    if (!session) return;
    setSopId(id);
    setSteps([]);
    setError(null);
    setLoading(true);
    try {
      setSteps(await listBuilderSteps(session.accessToken, id));
    } catch (reason) {
      setError(messageFrom(reason));
      setSopId(null);
    } finally {
      setLoading(false);
    }
  }

  async function attach(stepId: string) {
    if (!session || !sopId || !flowchartId) {
      setError("Save the map before exporting.");
      return;
    }
    setAttaching(true);
    setError(null);
    try {
      const pdf = await renderPrintPdf(graph);
      const result = await attachFlowchart(
        session.accessToken,
        attachPayload({
          sopId,
          stepId,
          flowchartId,
          title: graph.title,
          purpose: flowchartPurpose(graph),
          graph,
          pdfBase64: uint8ToBase64(pdf),
        }),
      );
      setDone(result);
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setAttaching(false);
    }
  }

  const sop = sops.find((item) => item.id === sopId);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-wizard-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-lime uppercase">
          Export to Builder Pro
        </p>
        <h2 id="export-wizard-title" className="font-display mt-2 text-2xl font-semibold text-zinc-50">
          {done ? "Flowchart attached" : sopId ? "Choose a step" : "Choose an SOP"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {done
            ? "Builder should show “Flowchart, click to open”. The click opens this printable PDF."
            : sopId
              ? "Which step would you like to add it to?"
              : "Which SOP would you like to export this to?"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{graph.title}</p>
        {done ? (
          <p className="mt-2 text-xs text-zinc-400">
            {done.placement === "own" ? "Its Own Step" : "Existing step"} · {done.pdfUrl}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-amber-200">{error}</p> : null}
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
          {!loading && !sopId && !done
            ? sops.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={attaching}
                  onClick={() => void chooseSop(item.id)}
                  className="block w-full rounded-sm border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-100 hover:border-lime"
                >
                  {item.title}
                </button>
              ))
            : null}
          {!loading && !sopId && !done && sops.length === 0 && !error ? (
            <p className="text-sm text-zinc-400">
              No SOPs yet. Create one in Builder Pro, then export again. This map is already in your library.
            </p>
          ) : null}
          {sopId && !done ? (
            <>
              <p className="text-xs text-zinc-500">{sop?.title}</p>
              <button
                type="button"
                disabled={attaching}
                onClick={() => void attach(OWN_STEP_ID)}
                className="block w-full rounded-sm border border-lime bg-lime/10 px-3 py-2 text-left text-sm font-semibold text-lime"
              >
                Its Own Step
              </button>
              {steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  disabled={attaching}
                  onClick={() => void attach(step.id)}
                  className="block w-full rounded-sm border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-100 hover:border-lime"
                >
                  {step.number != null ? `${step.number}. ` : ""}
                  {step.title}
                </button>
              ))}
            </>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          {sopId && !done ? (
            <button
              type="button"
              className="rounded-sm border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
              onClick={() => {
                setSopId(null);
                setError(null);
              }}
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-sm px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
          >
            {done ? "Done" : "Cancel"}
          </button>
          {attaching ? <p className="py-2 text-sm text-zinc-500">Adding the PDF…</p> : null}
        </div>
      </div>
    </div>
  );
}

function messageFrom(reason: unknown): string {
  if (reason instanceof BuilderRequestError) {
    return reason.expected ? `${reason.message} Expected ${reason.expected}.` : reason.message;
  }
  return reason instanceof Error ? reason.message : "Export failed.";
}
