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
import { newId, type FlowGraph } from "@/lib/graph";
import {
  persistGraph,
  persistUnlock,
  readGraphSnapshot,
  readUnlockSnapshot,
  serverGraphSnapshot,
  serverUnlockSnapshot,
  subscribePersist,
} from "@/lib/persist";
import { builderSendUrl } from "@/lib/site";
import { demoGraph } from "@/lib/template-graph";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { InputDock } from "./InputDock";
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

  async function exportPng() {
    const el = document.querySelector(".flowchart-canvas .react-flow") as HTMLElement | null;
    if (!el) {
      setStatus("Canvas is not ready to export.");
      return;
    }
    const dataUrl = await toPng(el, {
      backgroundColor: "#09090b",
      cacheBust: true,
      pixelRatio: 2,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${graphFilename(graph).replace(/\.json$/, "")}.png`;
    a.click();
  }

  async function runPremium(action: PremiumAction) {
    if (!canUsePremium(unlock)) {
      openGate(action);
      return;
    }
    if (action === "print") {
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
    const pkg = exportToBuilder(graph);
    downloadText(builderPackageFilename(pkg), JSON.stringify(pkg, null, 2));
    window.open(builderSendUrl(), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
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

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${
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
          className={`${
            tab === "chat" ? "flex" : "hidden"
          } w-full min-h-0 flex-col border-l border-zinc-800 bg-zinc-950 lg:flex lg:w-80`}
        >
          <ChatPanel messages={messages} busy={busy} onSend={(message) => void chat(message)} />
        </aside>
      </div>

      <section className="print-only hidden print:block">
        <h1 className="font-display text-2xl font-semibold">{graph.title}</h1>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          {graph.nodes
            .filter((node) => node.kind === "step" || node.kind === "decision")
            .map((node) => (
              <li key={node.id}>
                <strong>{node.kind === "decision" ? "Decision: " : ""}</strong>
                {node.label}
              </li>
            ))}
        </ol>
      </section>

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
