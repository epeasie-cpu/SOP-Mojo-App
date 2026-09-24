"use client";

import { toPng } from "html-to-image";
import dynamic from "next/dynamic";
import { useCallback, useState, useSyncExternalStore } from "react";
import { canUsePremium, gateLabel, type PremiumAction } from "@/lib/entitlements";
import {
  builderPackageFilename,
  exportToBuilder,
  graphFilename,
} from "@/lib/export-to-builder";
import { listableNodes, newId, type FlowGraph } from "@/lib/graph";
import {
  persistGraph,
  persistUnlock,
  readGraphSnapshot,
  readUnlockSnapshot,
  serverGraphSnapshot,
  serverUnlockSnapshot,
  subscribePersist,
} from "@/lib/persist";
import { paginatePrintMap } from "@/lib/print-pages";
import { builderSendUrl } from "@/lib/site";
import { demoGraph } from "@/lib/template-graph";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { InputDock } from "./InputDock";
import { PrintMap } from "./PrintMap";
import { StepList } from "./StepList";
import { Toolbar } from "./Toolbar";
import { UnlockHint, UnlockModal } from "./UnlockModal";

const FlowCanvas = dynamic(
  () => import("./FlowCanvas").then((mod) => ({ default: mod.FlowCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] flex-1 items-center justify-center text-sm text-zinc-500">
        Loading canvas…
      </div>
    ),
  },
);

type MobileTab = "build" | "canvas" | "chat";

function downloadText(filename: string, contents: string, type = "application/json") {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function StudioApp() {
  const graph = useSyncExternalStore(subscribePersist, readGraphSnapshot, serverGraphSnapshot);
  const unlock = useSyncExternalStore(subscribePersist, readUnlockSnapshot, serverUnlockSnapshot);
  const setGraph = useCallback((next: FlowGraph | ((prev: FlowGraph) => FlowGraph)) => {
    const resolved = typeof next === "function" ? next(readGraphSnapshot()) : next;
    persistGraph(resolved);
  }, []);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [modeLabel, setModeLabel] = useState("Ready");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateDetail, setGateDetail] = useState(gateLabel("export"));
  const [tab, setTab] = useState<MobileTab>("canvas");

  const onChange = useCallback((next: FlowGraph) => setGraph(next), [setGraph]);

  function pushAssistant(text: string) {
    setMessages((prev) => [...prev, { id: newId("m"), role: "assistant", text }]);
  }

  async function generate(text: string, source: "text" | "voice") {
    setBusy(true);
    setStatus(source === "voice" ? "Mapping voice…" : "Mapping process…");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source }),
      });
      const data = (await response.json()) as {
        graph?: FlowGraph;
        mode?: string;
        llmFailed?: boolean;
        error?: string;
      };
      if (!response.ok || !data.graph) {
        throw new Error(data.error || "Could not map that process.");
      }
      setGraph(data.graph);
      setModeLabel(
        data.mode === "template"
          ? "Template mode"
          : data.llmFailed
            ? "AI fallback"
            : "AI map",
      );
      setStatus(null);
      setTab("canvas");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generate failed.");
    } finally {
      setBusy(false);
    }
  }

  async function photo(dataUrl: string) {
    setBusy(true);
    setStatus("Reading handwriting…");
    try {
      const response = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = (await response.json()) as {
        graph?: FlowGraph;
        error?: string;
        mode?: string;
      };
      if (!response.ok || !data.graph) {
        throw new Error(data.error || "Could not read that photo.");
      }
      setGraph(data.graph);
      setModeLabel("Photo vision");
      setStatus(null);
      setTab("canvas");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Photo read failed.");
    } finally {
      setBusy(false);
    }
  }

  async function chat(message: string) {
    setMessages((prev) => [...prev, { id: newId("m"), role: "user", text: message }]);
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph, message }),
      });
      const data = (await response.json()) as {
        graph?: FlowGraph;
        reply?: string;
        error?: string;
      };
      if (!response.ok || !data.graph) {
        throw new Error(data.error || "Chat edit failed.");
      }
      setGraph(data.graph);
      pushAssistant(data.reply || "Updated the flowchart.");
    } catch (error) {
      pushAssistant(error instanceof Error ? error.message : "Chat edit failed.");
    } finally {
      setBusy(false);
    }
  }

  function openGate(action: PremiumAction) {
    setGateDetail(gateLabel(action));
    setGateOpen(true);
  }

  async function capturePng(): Promise<string> {
    const el = document.querySelector(".flowchart-canvas .react-flow") as HTMLElement | null;
    if (!el) {
      throw new Error("Canvas is not ready to export.");
    }
    return toPng(el, {
      backgroundColor: "#09090b",
      cacheBust: true,
      pixelRatio: 2,
    });
  }

  async function exportPng() {
    const dataUrl = await capturePng();
    downloadDataUrl(`${graphFilename(graph).replace(/\.json$/, "")}.png`, dataUrl);
    return dataUrl;
  }

  async function runPremium(action: PremiumAction) {
    if (!canUsePremium(unlock)) {
      openGate(action);
      return;
    }
    if (action === "print") {
      // Orientation comes from top-level @page { size: letter landscape } in globals.css.
      window.print();
      return;
    }
    if (action === "export") {
      downloadText(graphFilename(graph), JSON.stringify(graph, null, 2));
      try {
        await exportPng();
      } catch {
        setStatus("JSON downloaded. PNG export needs a larger canvas — try desktop.");
      }
      return;
    }
    let flowchartPng: string | undefined;
    try {
      flowchartPng = await capturePng();
    } catch {
      setStatus("Sending the map without a PNG preview — try desktop for the image.");
    }
    const stepParam =
      typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("step")) : NaN;
    const step = Number.isFinite(stepParam) && stepParam >= 1 ? Math.floor(stepParam) : undefined;
    try {
      const response = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graph,
          title: graph.title,
          image: flowchartPng,
          generatedAt: new Date().toISOString(),
        }),
      });
      const data = (await response.json()) as {
        jsonUrl?: string;
        imageUrl?: string;
        title?: string;
        error?: string;
      };
      if (!response.ok || !data.jsonUrl) {
        throw new Error(data.error || "Could not publish the Builder handoff.");
      }
      window.open(
        builderSendUrl({
          flowchartJson: data.jsonUrl,
          flowchartImage: data.imageUrl,
          flowchartTitle: data.title || graph.title,
          step,
        }),
        "_blank",
        "noopener,noreferrer",
      );
      return;
    } catch {
      const pkg = exportToBuilder(graph, new Date().toISOString(), flowchartPng);
      downloadText(builderPackageFilename(pkg), JSON.stringify(pkg, null, 2));
      if (flowchartPng) downloadDataUrl(pkg.attach.imageFilename, flowchartPng);
      window.open(builderSendUrl({ flowchartTitle: graph.title, step }), "_blank", "noopener,noreferrer");
      setStatus("Opened Builder. Drop the downloaded JSON onto a step if it does not attach automatically.");
    }
  }

  return (
    <div className="studio-shell flex min-h-0 flex-1 flex-col bg-zinc-950">
      {unlock.unlocked ? null : (
        <UnlockHint onOpen={() => openGate("export")} />
      )}
      <Toolbar
        graph={graph}
        modeLabel={modeLabel}
        unlock={unlock}
        busy={busy}
        onTitle={(title) => setGraph((prev) => ({ ...prev, title }))}
        onPremium={(action) => void runPremium(action)}
        onDemo={() => {
          setGraph(demoGraph());
          setModeLabel("Demo");
          setTab("canvas");
        }}
      />
      {status ? (
        <p className="no-print border-b border-zinc-800 px-4 py-2 text-sm text-amber-200" role="status">
          {status}
        </p>
      ) : null}

      <div className="no-print flex gap-1 border-b border-zinc-800 px-3 py-2 lg:hidden">
        {(
          [
            ["build", "Capture"],
            ["canvas", "Canvas"],
            ["chat", "Chat"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-sm px-2 py-1.5 text-xs font-semibold ${
              tab === id ? "bg-lime text-lime-ink" : "bg-zinc-900 text-zinc-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {paginatePrintMap(graph).map((page) => (
        <section
          key={`print-sheet-${page.index}`}
          className={`print-only print-sheet${page.index === page.total - 1 ? " print-sheet-last" : ""} hidden print:flex`}
          data-print-page={page.index + 1}
          data-print-total={page.total}
          data-continue-next={page.continueNext ? "1" : "0"}
          data-continue-prev={page.continuePrev ? "1" : "0"}
          data-backtrack={page.backtrack ? "1" : "0"}
        >
          {page.index === 0 ? (
            <div className="print-title">
              <h1 className="font-display text-2xl font-semibold">{graph.title}</h1>
            </div>
          ) : null}
          <div className="print-map-wrap">
            <PrintMap
              graph={page.graph}
              alreadyLaid
              continuations={page.continuations}
              pageKey={String(page.index)}
            />
            {page.total > 1 ? (
              <p className="print-page-num">
                Page {page.index + 1} of {page.total}
              </p>
            ) : null}
          </div>
          {page.index === page.total - 1 ? (
            <section className="print-steps">
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
                {listableNodes(graph).map((node) => {
                  const branches = graph.edges
                    .filter((edge) => edge.source === node.id && edge.label)
                    .map((edge) => String(edge.label));
                  return (
                    <li key={node.id}>
                      <strong>{node.kind === "decision" ? "Decision: " : ""}</strong>
                      {node.label}
                      {node.kind === "decision" && branches.length ? (
                        <span>{` (${branches.join(" / ")})`}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
        </section>
      ))}

      <div className="studio-workspace no-print flex min-h-0 flex-1">
        <aside
          className={`no-print ${
            tab === "build" ? "flex" : "hidden"
          } w-full min-h-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex lg:w-80`}
        >
          <InputDock busy={busy} onGenerate={(text, source) => void generate(text, source)} onPhoto={(data) => void photo(data)} />
          <StepList
            graph={graph}
            onChange={onChange}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        <div
          className={`${
            tab === "canvas" ? "flex" : "hidden"
          } min-h-0 min-w-0 flex-1 flex-col lg:flex print:flex`}
        >
          <FlowCanvas graph={graph} onChange={onChange} />
        </div>

        <aside
          className={`no-print ${
            tab === "chat" ? "flex" : "hidden"
          } w-full min-h-0 flex-col border-l border-zinc-800 bg-zinc-950 lg:flex lg:w-80`}
        >
          <ChatPanel messages={messages} busy={busy} onSend={(message) => void chat(message)} />
        </aside>
      </div>

      <UnlockModal
        open={gateOpen}
        detail={gateDetail}
        onClose={() => setGateOpen(false)}
        onUnlockBrowser={(source) => {
          persistUnlock(source);
          setGateOpen(false);
        }}
      />
    </div>
  );
}
