"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { buildRefinePrompt } from "@/lib/refine-prompt";
import { SITE, WRITER_UPGRADE_URL, hostLabel } from "@/lib/site";
import type { GenerateMode, SopDraft, SopInput } from "@/lib/sop";
import { sopFilename, sopToMarkdown, sopToPrintHtml } from "@/lib/sop-export";

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
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
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
    setLoading(true);
    setError(null);
    setCopied("none");
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

  async function copyMarkdown() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied("md");
  }

  async function copyPrompt() {
    if (!refinePrompt) return;
    await navigator.clipboard.writeText(refinePrompt);
    setCopied("prompt");
  }

  async function captureEmail(event: React.FormEvent) {
    event.preventDefault();
    setEmailStatus(null);
    const response = await fetch("/api/capture-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, processName: form.processName }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    setEmailStatus(
      response.ok && data.ok
        ? "Saved locally. We did not send this to an email provider."
        : data.error || "Could not save email.",
    );
  }

  return (
    <div>
      <form
        id="generator"
        onSubmit={onSubmit}
        className="rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Business type
            <input
              required
              value={form.businessType}
              onChange={(event) => update("businessType", event.target.value)}
              list="business-types"
              placeholder="e.g. trades shop, hotel, B2B firm"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-base font-normal"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Process name
            <input
              required
              value={form.processName}
              onChange={(event) => update("processName", event.target.value)}
              placeholder="e.g. guest room turnover"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-base font-normal"
            />
          </label>
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            Role (owner)
            <input
              required
              value={form.role}
              onChange={(event) => update("role", event.target.value)}
              placeholder="e.g. lead technician"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-base font-normal"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Tools <span className="font-normal text-muted">(optional)</span>
            <input
              value={form.tools}
              onChange={(event) => update("tools", event.target.value)}
              placeholder="CRM, cart, work-order app…"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-base font-normal"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Outcome / KPI <span className="font-normal text-muted">(optional)</span>
            <input
              value={form.kpi}
              onChange={(event) => update("kpi", event.target.value)}
              placeholder="e.g. first-time fix rate"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-base font-normal"
            />
          </label>
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            Trigger <span className="font-normal text-muted">(optional)</span>
            <input
              value={form.trigger}
              onChange={(event) => update("trigger", event.target.value)}
              placeholder="e.g. dispatched work order"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-base font-normal"
            />
          </label>
        </div>
        <datalist id="business-types">
          {BUSINESS_SUGGESTIONS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-sm bg-lime px-4 py-3 text-sm font-semibold text-lime-ink hover:bg-lime/90 disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Writing first draft…" : "Write first-draft SOP"}
        </button>
      </form>

      <SopOutput
        sop={sop}
        mode={mode}
        llmFailed={llmFailed}
        markdown={markdown}
        copied={copied}
        email={email}
        emailStatus={emailStatus}
        outputSlotId={outputSlotId}
        isClient={isClient}
        onCopyMarkdown={copyMarkdown}
        onCopyPrompt={copyPrompt}
        onEmailChange={setEmail}
        onCaptureEmail={captureEmail}
      />
    </div>
  );
}

function SopOutput({
  sop,
  mode,
  llmFailed,
  markdown,
  copied,
  email,
  emailStatus,
  outputSlotId,
  isClient,
  onCopyMarkdown,
  onCopyPrompt,
  onEmailChange,
  onCaptureEmail,
}: {
  sop: SopDraft | null;
  mode: GenerateMode | null;
  llmFailed: boolean;
  markdown: string;
  copied: "md" | "prompt" | "none";
  email: string;
  emailStatus: string | null;
  outputSlotId?: string;
  isClient: boolean;
  onCopyMarkdown: () => void;
  onCopyPrompt: () => void;
  onEmailChange: (value: string) => void;
  onCaptureEmail: (event: React.FormEvent) => void;
}) {
  if (!sop) return null;
  const output = (
        <article
          id="sop-output"
          className="sop-document mt-8 rounded-xl border border-line bg-white p-5 sm:p-8"
        >
          <p className="banner rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-ink">
            {SITE.banner}
          </p>
          {mode === "template" ? (
            <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">
              Template mode — no language-model API key configured
            </p>
          ) : llmFailed ? (
            <p className="mt-3 text-xs text-muted">
              Language model unavailable. Showing a structured draft from the same SOP skeleton.
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted">AI first draft from AI SOP Writer.</p>
          )}
          <h2 className="font-display mt-4 text-3xl font-semibold text-ink">{sop.title}</h2>
          <SopSections sop={sop} />
          <div className="no-print mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopyMarkdown}
              className="rounded-sm bg-forest px-3 py-2 text-sm font-semibold text-white hover:bg-forest/90"
            >
              {copied === "md" ? "Copied Markdown" : "Copy Markdown"}
            </button>
            <button
              type="button"
              onClick={onCopyPrompt}
              title="Paste into ChatGPT, Claude, Gemini, or any GPT tool"
              className="rounded-sm border border-forest px-3 py-2 text-sm font-semibold text-ink hover:bg-paper"
            >
              {copied === "prompt" ? "Prompt copied" : "Copy AI prompt"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-sm border border-forest px-3 py-2 text-sm font-semibold text-ink hover:bg-paper"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(sopFilename(sop, "md"), markdown, "text/markdown;charset=utf-8")
              }
              className="rounded-sm border border-forest px-3 py-2 text-sm font-semibold text-ink hover:bg-paper"
            >
              Download Markdown
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  sopFilename(sop, "html"),
                  sopToPrintHtml(sop),
                  "text/html;charset=utf-8",
                )
              }
              className="rounded-sm border border-forest px-3 py-2 text-sm font-semibold text-ink hover:bg-paper"
            >
              Download print HTML
            </button>
          </div>
          <form onSubmit={onCaptureEmail} className="no-print mt-6 border-t border-line pt-4">
            <p className="text-sm font-medium text-ink">
              Optional: save your email locally with this draft
            </p>
            <p className="text-xs text-muted">
              Logged on this server only. No email service provider required.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-sm bg-forest px-4 py-2 text-sm text-white"
              >
                Save email
              </button>
            </div>
            {emailStatus ? <p className="mt-2 text-xs text-muted">{emailStatus}</p> : null}
          </form>
          <div className="no-print mt-6 rounded-md bg-paper p-4 text-sm">
            <p className="font-semibold text-ink">Ready for a living system?</p>
            <p className="mt-1 text-muted">
              Take the reviewed SOP into SOP Builder Pro. Browse more tools in the SOP Library,
              or visit SOP Mojo.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={WRITER_UPGRADE_URL} className="font-semibold text-forest underline">
                Get Builder Pro
              </a>
              <a href={SITE.builder} className="underline">
                Living system
              </a>
              <a href={SITE.library} className="underline">
                SOP Library
              </a>
              <a href={SITE.parent} className="underline">
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
    <div className="mt-6 space-y-6 text-ink">
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">Purpose</h3>
        <p className="mt-1">{sop.purpose}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">Owner</h3>
        <p className="mt-1">{sop.owner}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">Trigger</h3>
        <p className="mt-1">{sop.trigger}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">Tools</h3>
        <ul className="mt-1 list-disc pl-5">
          {sop.tools.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">KPI</h3>
        <p className="mt-1">{sop.kpi}</p>
      </section>
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">Steps</h3>
        <ol className="mt-2 space-y-3">
          {sop.steps.map((step) => (
            <li key={step.number}>
              <p className="font-semibold">
                {step.number}. {step.title}
              </p>
              <p className="text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">
          Exceptions
        </h3>
        <ul className="mt-1 list-disc pl-5">
          {sop.exceptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">Checklist</h3>
        <ul className="mt-1 list-disc pl-5">
          {sop.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="text-sm font-semibold tracking-[0.14em] text-forest uppercase">
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
