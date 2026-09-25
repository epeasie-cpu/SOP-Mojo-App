"use client";

import { toPng } from "html-to-image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { allowsPremium, canPrintExport, gateLabel, type PremiumAction } from "@/lib/entitlements";
import {
  readEntitlementSnapshot,
  refreshEntitlements,
  serverEntitlementSnapshot,
  subscribeEntitlements,
} from "@/lib/entitlement-state";
import { graphFilename } from "@/lib/export-to-builder";
import { newId, type FlowGraph } from "@/lib/graph";
import { saveLibraryMap } from "@/lib/library-client";
import {
  persistGraph,
  readGraphSnapshot,
  serverGraphSnapshot,
  subscribePersist,
} from "@/lib/persist";
import { printInstructions } from "@/lib/print-instructions";
import { ensurePrintPageStyle, presentPrintPdf, printPdfFilename } from "@/lib/print-page";
import { renderPrintPdf } from "@/lib/print-pdf";
import { paginatePrintMap } from "@/lib/print-pages";
import {
  readLibraryIdSnapshot,
  readSessionSnapshot,
  serverSessionSnapshot,
  subscribeSession,
  writeLibraryId,
} from "@/lib/session";
import { demoGraph } from "@/lib/template-graph";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { ExportWizard } from "./ExportWizard";
import { InputDock } from "./InputDock";
import { LibraryModal } from "./LibraryModal";
import { PrintMap } from "./PrintMap";
import { SignInModal } from "./SignInModal";
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
  const entitlements = useSyncExternalStore(
    subscribeEntitlements,
    readEntitlementSnapshot,
    serverEntitlementSnapshot,
  );
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
  const [gateAction, setGateAction] = useState<PremiumAction>("export");
  const [gateDetail, setGateDetail] = useState(gateLabel("export"));
  const pendingAction = useRef<PremiumAction | null>(null);
  const [tab, setTab] = useState<MobileTab>("canvas");
  const session = useSyncExternalStore(subscribeSession, readSessionSnapshot, serverSessionSnapshot);
  const libraryId = useSyncExternalStore(
    subscribeSession,
    readLibraryIdSnapshot,
    (): string | null => null,
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authPurpose, setAuthPurpose] = useState<"export" | "library" | "purchase">("library");
  const [resumeExport, setResumeExport] = useState(false);
  const printing = useRef(false);

  useEffect(() => {
    ensurePrintPageStyle();
    window.addEventListener("beforeprint", ensurePrintPageStyle);
    return () => window.removeEventListener("beforeprint", ensurePrintPageStyle);
  }, []);

  useEffect(() => {
    void refreshEntitlements(session?.accessToken);
  }, [session?.accessToken]);

  const rememberMap = useCallback((id: string | null) => {
    writeLibraryId(id);
  }, []);

  const adoptGraph = useCallback(
    (next: FlowGraph) => {
      rememberMap(null);
      setGraph(next);
    },
    [rememberMap, setGraph],
  );

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
      adoptGraph(data.graph);
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
      adoptGraph(data.graph);
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
    setGateAction(action);
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
    const fresh = await refreshEntitlements(readSessionSnapshot()?.accessToken);
    if (!allowsPremium(fresh, action)) {
      pendingAction.current = action;
      openGate(action);
      return;
    }
    pendingAction.current = null;
    if (action === "print") {
      if (printing.current) return;
      printing.current = true;
      // Open before the await so the tab is part of this click, not a blocked popup.
      const preview = window.open("", "_blank");
      setBusy(true);
      setStatus("Preparing letter-landscape PDF…");
      try {
        const bytes = await renderPrintPdf(graph);
        const filename = printPdfFilename(graph.title);
        const mode = presentPrintPdf(bytes, filename, preview);
        setStatus(
          mode === "opened"
            ? "Opened a letter-landscape PDF. Print or save that file — its pages are already landscape."
            : "Downloaded a letter-landscape PDF.",
        );
      } catch (error) {
        preview?.close();
        setStatus(error instanceof Error ? error.message : "Could not build the PDF.");
      } finally {
        printing.current = false;
        setBusy(false);
      }
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
    await beginExport();
  }

  async function beginExport() {
    const current = readSessionSnapshot();
    if (!current) {
      setAuthPurpose("export");
      setResumeExport(true);
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setStatus("Saving map…");
    try {
      const saved = await saveLibraryMap(current, readGraphSnapshot(), readLibraryIdSnapshot());
      rememberMap(saved.id);
      setWizardOpen(true);
      setStatus(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the map.");
    } finally {
      setBusy(false);
    }
  }

  const instructions = printInstructions(graph);

  return (
    <div className="studio-shell flex min-h-0 flex-1 flex-col bg-zinc-950">
      {canPrintExport(entitlements) ? null : (
        <UnlockHint onOpen={() => openGate("export")} />
      )}
      <Toolbar
        graph={graph}
        modeLabel={modeLabel}
        entitlements={entitlements}
        busy={busy}
        onTitle={(title) => setGraph((prev) => ({ ...prev, title }))}
        onPremium={(action) => void runPremium(action)}
        onLibrary={() => {
          if (!readSessionSnapshot()) {
            setAuthPurpose("library");
            setResumeExport(false);
            setAuthOpen(true);
            return;
          }
          setLibraryOpen(true);
        }}
        accountLabel={session?.email || (session ? "Signed in" : null)}
        onDemo={() => {
          adoptGraph(demoGraph());
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
        </section>
      ))}
      {instructions.length > 0 ? (
        <section
          className="print-only print-instructions hidden print:block"
          data-print-instructions="1"
        >
          <h2 className="print-instructions-heading font-display">Instructions</h2>
          {graph.title.trim() ? <p className="print-instructions-sub">{graph.title}</p> : null}
          <ol className="print-steps">
            {instructions.map((item) => (
              <li key={item.id}>{item.text}</li>
            ))}
          </ol>
        </section>
      ) : null}

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
        action={gateAction}
        detail={gateDetail}
        onClose={() => setGateOpen(false)}
        onSignIn={() => {
          setGateOpen(false);
          setAuthPurpose(gateAction === "send" ? "export" : "purchase");
          setAuthOpen(true);
        }}
      />
      <SignInModal
        open={authOpen}
        purpose={authPurpose}
        onClose={() => {
          setAuthOpen(false);
          setResumeExport(false);
        }}
        onSignedIn={() => {
          setAuthOpen(false);
          const action = pendingAction.current;
          pendingAction.current = null;
          if (action) {
            void runPremium(action);
            return;
          }
          if (resumeExport) {
            setResumeExport(false);
            void beginExport();
          }
        }}
      />
      <LibraryModal
        open={libraryOpen}
        session={session}
        graph={graph}
        libraryId={libraryId}
        onClose={() => setLibraryOpen(false)}
        onLoad={(next, id) => {
          rememberMap(id);
          setGraph(next);
          setModeLabel("Library");
          setTab("canvas");
        }}
        onSaved={rememberMap}
        onSignOut={() => {
          setLibraryOpen(false);
          rememberMap(null);
        }}
      />
      <ExportWizard
        open={wizardOpen}
        session={session}
        flowchartId={libraryId}
        graph={graph}
        onClose={() => setWizardOpen(false)}
      />
    </div>
  );
}
