"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { EmailSopModal } from "@/components/EmailSopModal";
import {
  draftDeliveryKey,
  leaveActionRequiresEmail,
  type LeaveBrowserAction,
} from "@/lib/leave-gate";
import { buildRefinePrompt } from "@/lib/refine-prompt";
import { SITE, WRITER_UPGRADE_URL, hostLabel } from "@/lib/site";
import type { GenerateMode, SopDraft, SopInput } from "@/lib/sop";
import { sopFilename, sopToMarkdown, sopToPrintHtml } from "@/lib/sop-export";

const fieldClass =
  "mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-normal text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-lime";
const outlineButtonClass =
  "rounded-sm border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-lime";

const BUSINESS_SUGGESTIONS = [
  "Professional services firm",
  "B2B services company",
  "Hospitality / facilities",
  "Residential and light-commercial trades",
  "Small operating company",
  "Growing operations team",
];

type Props = {
  defaults?: Partial<SopInput>;
  outputSlotId?: string;
};

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function Generator({ defaults, outputSlotId }: Props) {
  const [form, setForm] = useState<SopInput>({
    businessType: defaults?.businessType ?? "",
    processName: defaults?.processName ?? "",
    role: defaults?.role ?? "",
    tools: defaults?.tools ?? "",
    kpi: defaults?.kpi ?? "",
    trigger: defaults?.trigger ?? "",
  });
  const [sop, setSop] = useState<SopDraft | null>(null);
  const [mode, setMode] = useState<GenerateMode | null>(null);
  const [llmFailed, setLlmFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"md" | "prompt" | "none">("none");
  const [gateOpen, setGateOpen] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [inboxStatus, setInboxStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<{ email: string; sopKey: string } | null>(null);
  const pendingLeave = useRef<LeaveBrowserAction | null>(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const markdown = useMemo(() => (sop ? sopToMarkdown(sop) : ""), [sop]);
  const refinePrompt = useMemo(
    () => (sop ? buildRefinePrompt(sop, form) : ""),
    [sop, form],
  );

  function update<K extends keyof SopInput>(key: K, value: SopInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (gateBusy) return;
    setLoading(true);
    setError(null);
    setCopied("none");
    setInboxStatus(null);
    setActionError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        error?: string;
        sop?: SopDraft;
        mode?: GenerateMode;
        llmFailed?: boolean;
      };
      if (!response.ok || !data.sop || !data.mode) {
        throw new Error(data.error || "Could not generate a draft.");
      }
      setSop(data.sop);
      setDelivery(null);
      setMode(data.mode);
      setLlmFailed(Boolean(data.llmFailed));
      requestAnimationFrame(() => {
        document.getElementById("sop-output")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a draft.");
    } finally {
      setLoading(false);
    }
  }

  async function performLeave(action: LeaveBrowserAction) {
    if (!sop) return;
    setActionError(null);
    try {
      if (action === "copy-md") {
        if (!markdown) return;
        await navigator.clipboard.writeText(markdown);
        setCopied("md");
        return;
      }
      if (action === "copy-prompt") {
        if (!refinePrompt) return;
        await navigator.clipboard.writeText(refinePrompt);
        setCopied("prompt");
        return;
      }
      if (action === "print") {
        window.print();
        return;
      }
      if (action === "download-md") {
        downloadFile(sopFilename(sop, "md"), markdown, "text/markdown;charset=utf-8");
        return;
      }
      downloadFile(sopFilename(sop, "html"), sopToPrintHtml(sop), "text/html;charset=utf-8");
    } catch {
      setActionError("Sent to your inbox. Click the button again if the browser blocked that action.");
    }
  }

  function requestLeave(action: LeaveBrowserAction) {
    if (!sop || gateBusy) return;
    const delivered = delivery?.sopKey === draftDeliveryKey(sop);
    if (!leaveActionRequiresEmail(delivered)) {
      void performLeave(action);
      return;
    }
    pendingLeave.current = action;
    setGateError(null);
    setGateOpen(true);
  }

  function closeGate() {
    if (gateBusy) return;
    pendingLeave.current = null;
    setGateOpen(false);
    setGateError(null);
  }

  async function onEmailSubmit(email: string) {
    if (!sop || gateBusy) return;
    const intent = pendingLeave.current;
    if (!intent) return;
    setGateBusy(true);
    setGateError(null);
    try {
      const response = await fetch("/api/email-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent, sop }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        setGateError(
          data?.error ||
            "We couldn't send the SOP to that inbox. Check the address and try again.",
        );
        return;
      }
      setDelivery({ email: email.trim(), sopKey: draftDeliveryKey(sop) });
      setInboxStatus(`Sent to ${email.trim()}. Check your inbox.`);
      setGateOpen(false);
      pendingLeave.current = null;
      void performLeave(intent);
    } catch {
      setGateError("We couldn't send the SOP to that inbox. Check the address and try again.");
    } finally {
      setGateBusy(false);
    }
  }

  return (
    <div>
      <form
        id="generator"
        onSubmit={onSubmit}
        className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:p-6"
      >
        <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
          First draft
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-200">
            Business type
            <input
              required
              value={form.businessType}
              onChange={(event) => update("businessType", event.target.value)}
              list="business-types"
              placeholder="e.g. trades shop, hotel, B2B firm"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200">
            Process name
            <input
              required
              value={form.processName}
              onChange={(event) => update("processName", event.target.value)}
              placeholder="e.g. guest room turnover"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200 sm:col-span-2">
            Role (owner)
            <input
              required
              value={form.role}
              onChange={(event) => update("role", event.target.value)}
              placeholder="e.g. lead technician"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200">
            Tools <span className="font-normal text-zinc-500">(optional)</span>
            <input
              value={form.tools}
              onChange={(event) => update("tools", event.target.value)}
              placeholder="CRM, cart, work-order app…"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200">
            Outcome / KPI <span className="font-normal text-zinc-500">(optional)</span>
            <input
              value={form.kpi}
              onChange={(event) => update("kpi", event.target.value)}
              placeholder="e.g. first-time fix rate"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200 sm:col-span-2">
            Trigger <span className="font-normal text-zinc-500">(optional)</span>
            <input
              value={form.trigger}
              onChange={(event) => update("trigger", event.target.value)}
              placeholder="e.g. dispatched work order"
              className={fieldClass}
            />
          </label>
        </div>
        <datalist id="business-types">
          {BUSINESS_SUGGESTIONS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        {error ? <p className="mt-3 text-sm text-amber-300">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || gateBusy}
          className="mt-5 w-full rounded-sm bg-lime px-4 py-2.5 text-sm font-semibold text-lime-ink hover:bg-lime/90 disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Writing first draft…" : "Write first-draft SOP"}
        </button>
      </form>

      <SopOutput
        sop={sop}
        mode={mode}
        llmFailed={llmFailed}
        copied={copied}
        outputSlotId={outputSlotId}
        isClient={isClient}
        deliveredEmail={
          sop && delivery?.sopKey === draftDeliveryKey(sop) ? delivery.email : undefined
        }
        inboxStatus={inboxStatus}
        actionError={actionError}
        onCopyMarkdown={() => requestLeave("copy-md")}
        onCopyPrompt={() => requestLeave("copy-prompt")}
        onPrint={() => requestLeave("print")}
        onDownloadMarkdown={() => requestLeave("download-md")}
        onDownloadHtml={() => requestLeave("download-html")}
      />
      <EmailSopModal
        open={gateOpen}
        busy={gateBusy}
        error={gateError}
        onClose={closeGate}
        onSubmit={(email) => void onEmailSubmit(email)}
      />
    </div>
  );
}

function SopOutput({
  sop,
  mode,
  llmFailed,
  copied,
  outputSlotId,
  isClient,
  deliveredEmail,
  inboxStatus,
  actionError,
  onCopyMarkdown,
  onCopyPrompt,
  onPrint,
  onDownloadMarkdown,
  onDownloadHtml,
}: {
  sop: SopDraft | null;
  mode: GenerateMode | null;
  llmFailed: boolean;
  copied: "md" | "prompt" | "none";
  outputSlotId?: string;
  isClient: boolean;
  deliveredEmail?: string;
  inboxStatus: string | null;
  actionError: string | null;
  onCopyMarkdown: () => void;
  onCopyPrompt: () => void;
  onPrint: () => void;
  onDownloadMarkdown: () => void;
  onDownloadHtml: () => void;
}) {
  if (!sop) return null;
  const output = (
        <article
          id="sop-output"
          className="sop-document mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:p-8"
        >
          <p className="banner rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            {SITE.banner}
          </p>
          {mode === "template" ? (
            <p className="mt-3 text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
              Template mode — no language-model API key configured
            </p>
          ) : llmFailed ? (
            <p className="mt-3 text-xs text-zinc-500">
              Language model unavailable. Showing a structured draft from the same SOP skeleton.
            </p>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">AI first draft from AI SOP Writer.</p>
          )}
          <h2 className="font-display mt-4 text-3xl font-semibold text-zinc-50">{sop.title}</h2>
          <SopSections sop={sop} />
          {inboxStatus ? (
            <p className="no-print mt-6 text-sm text-lime" role="status">
              {inboxStatus}
            </p>
          ) : null}
          {actionError ? (
            <p className="no-print mt-3 text-sm text-amber-200" role="alert">
              {actionError}
            </p>
          ) : null}
          <p className="no-print mt-6 text-xs text-zinc-500">
            {deliveredEmail
              ? `Sent to ${deliveredEmail}. Copy, download, and print stay available for this draft.`
              : "Copy, download, and print email you this draft. You can review it on the page first."}
          </p>
          <div className="no-print mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              data-leave-action="copy-md"
              onClick={onCopyMarkdown}
              className={outlineButtonClass}
            >
              {copied === "md" ? "Copied Markdown" : "Copy Markdown"}
            </button>
            <button
              type="button"
              data-leave-action="copy-prompt"
              onClick={onCopyPrompt}
              title="Paste into ChatGPT, Claude, Gemini, or any GPT tool"
              className={outlineButtonClass}
            >
              {copied === "prompt" ? "Prompt copied" : "Copy AI prompt"}
            </button>
            <button
              type="button"
              data-leave-action="print"
              onClick={onPrint}
              className={outlineButtonClass}
            >
              Print
            </button>
            <button
              type="button"
              data-leave-action="download-md"
              onClick={onDownloadMarkdown}
              className={outlineButtonClass}
            >
              Download Markdown
            </button>
            <button
              type="button"
              data-leave-action="download-html"
              onClick={onDownloadHtml}
              className={outlineButtonClass}
            >
              Download print HTML
            </button>
          </div>
          <div className="no-print mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">
            <p className="font-semibold text-zinc-100">Ready for a living system?</p>
            <p className="mt-1 text-zinc-400">
              Take the reviewed SOP into SOP Builder Pro. Browse more tools in the SOP Library,
              or visit SOP Mojo.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={WRITER_UPGRADE_URL}
                className="rounded-sm bg-lime px-3 py-2 text-sm font-semibold text-lime-ink hover:bg-lime/90"
              >
                Get Builder Pro
              </a>
              <a
                href={SITE.builder}
                className="rounded-sm border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-lime"
              >
                Living system
              </a>
              <a
                href={SITE.library}
                className="rounded-sm border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-lime"
              >
                SOP Library
              </a>
              <a
                href={SITE.parent}
                className="rounded-sm border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-lime"
              >
                {hostLabel(SITE.parent)}
              </a>
            </div>
          </div>
        </article>
  );
  const slot = outputSlotId && isClient ? document.getElementById(outputSlotId) : null;
  return slot ? createPortal(output, slot) : output;
}

function SopSections({ sop }: { sop: SopDraft }) {
  return (
    <div className="mt-6 space-y-6 text-zinc-100">
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Purpose</h3>
        <p className="mt-1">{sop.purpose}</p>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Owner</h3>
        <p className="mt-1">{sop.owner}</p>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Trigger</h3>
        <p className="mt-1">{sop.trigger}</p>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Tools</h3>
        <ul className="mt-1 list-disc pl-5">
          {sop.tools.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">KPI</h3>
        <p className="mt-1">{sop.kpi}</p>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Steps</h3>
        <ol className="mt-2 space-y-3">
          {sop.steps.map((step) => (
            <li key={step.number}>
              <p className="font-semibold">
                {step.number}. {step.title}
              </p>
              <p className="text-zinc-400">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">
          Exceptions
        </h3>
        <ul className="mt-1 list-disc pl-5">
          {sop.exceptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">Checklist</h3>
        <ul className="mt-1 list-disc pl-5">
          {sop.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">
          Safety notes
        </h3>
        <ul className="mt-1 list-disc pl-5">
          {sop.safetyNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
