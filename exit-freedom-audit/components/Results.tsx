"use client";

import { useRef, useState } from "react";
import { isEmail, normalizeEmail } from "@/lib/email";
import type { Goal } from "@/lib/questions";
import { buildCallMailto } from "@/lib/call-mailto";
import { AI_AMPLIFIES, AI_RETEACH, shareSummaryFromReport, type Metric, type ScoreReport } from "@/lib/score";
import { SITE } from "@/lib/site";
import type { StoredMailchimp, StoredUnlock } from "@/lib/storage";
import { CallRequestDialog } from "./CallRequestDialog";
import { DimensionBar, ScoreGauge } from "./ScoreVisuals";

type Filter = "all" | "critical" | "quick";

const LOCKED_BANNER = "Email required to unlock this report";
const OPEN_BANNER = "Email unlocked this report";

export function Results({
  report,
  unlock,
  onUnlocked,
  onRetake,
}: {
  report: ScoreReport;
  unlock: StoredUnlock | null;
  onUnlocked: (unlock: StoredUnlock) => void;
  onRetake: () => void;
}) {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [callOpen, setCallOpen] = useState(false);
  const open = Boolean(unlock);
  const aiGap = report.gaps.find((gap) => gap.id === "ai");

  function focusUnlock() {
    emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    emailRef.current?.focus();
  }

  async function onUnlock(event: React.FormEvent) {
    event.preventDefault();
    const next = normalizeEmail(email);
    if (!isEmail(next)) {
      setError("Enter a valid email, like you@company.com.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: next, goal: report.goal }),
      });
      const data = (await response.json().catch(() => null)) as {
        unlocked?: boolean;
        error?: string;
        mailchimp?: StoredMailchimp;
      } | null;
      if (!response.ok || !data?.unlocked) {
        setError(data?.error || "Enter a valid email, like you@company.com.");
        return;
      }
      onUnlocked({
        email: next,
        goal: report.goal,
        mailchimp: data.mailchimp ?? { ok: false, reason: "error" },
      });
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const gaps =
    filter === "critical"
      ? report.gaps.filter((gap) => gap.critical)
      : filter === "quick"
        ? report.gaps.filter((gap) => gap.quickWin)
        : report.gaps;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {unlock ? OPEN_BANNER : LOCKED_BANNER}
      </p>

      {open ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-center shadow-sm">
            <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500">SCORE</p>
            <ScoreGauge score={report.score} />
            <p className="text-sm text-zinc-500">/ 100</p>
            <p className="mt-2 text-sm font-semibold text-mojo-ink">{report.bandLabel}</p>
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <BarCard label="Documentation" score={report.dimensions.documentation} />
            <BarCard label="Handoffs & coverage" score={report.dimensions.coverage} />
            <BarCard label="Visual process maps" score={report.dimensions.maps} />
            <BarCard label="Tool consistency" score={report.dimensions.tools} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_1fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center shadow-sm">
            <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500">YOUR SCORE</p>
            <p className="mt-2 text-7xl font-extrabold tracking-tight text-zinc-950">{report.score}</p>
            <p className="mt-3 text-sm font-semibold text-mojo-ink">{report.bandLabel}</p>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm text-zinc-500">Visible now</h2>
            <ul className="mt-3 space-y-2 text-[15px] font-medium text-zinc-950">
              {report.topGaps.map((gap) => (
                <li key={gap.id} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{gap.visible}</span>
                </li>
              ))}
            </ul>
            {aiGap ? <p className="mt-3 text-sm leading-relaxed text-zinc-700">{AI_RETEACH}</p> : null}
          </section>
        </div>
      )}

      <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-800">{AI_AMPLIFIES}</p>

      {open ? (
        <GapSection
          report={report}
          gaps={gaps}
          filter={filter}
          onFilter={setFilter}
          callHref={buildCallMailto(shareSummaryFromReport(report))}
          onCall={() => setCallOpen(true)}
        />
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {Object.values(report.metrics).map((metric) => (
          <MetricCard key={metric.id} metric={metric} open={open} onUnlock={focusUnlock} />
        ))}
      </div>

      {open ? null : (
        <form
          onSubmit={onUnlock}
          noValidate
          className="mt-4 rounded-2xl border-2 border-mojo bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Unlock the full report</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500">
                Headers stay visible. The numbers open with your email.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <label htmlFor="unlock-email" className="sr-only">
                Email
              </label>
              <input
                ref={emailRef}
                id="unlock-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-base outline-none focus:border-zinc-950 sm:w-64"
              />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {pending ? "Unlocking…" : "Unlock →"}
              </button>
            </div>
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </form>
      )}

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={onRetake} className="min-h-11 px-3 text-sm font-semibold text-zinc-600 hover:text-zinc-950">
          Retake the audit
        </button>
      </div>

      {callOpen ? <CallRequestDialog onClose={() => setCallOpen(false)} /> : null}
    </div>
  );
}

function BarCard({ label, score }: { label: string; score: number }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <DimensionBar label={label} score={score} />
    </section>
  );
}

function MetricCard({
  metric,
  open,
  onUnlock,
}: {
  metric: Metric;
  open: boolean;
  onUnlock: () => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold tracking-tight text-zinc-950">{metric.title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{metric.subtitle}</p>
      {open ? (
        <div className="mt-4">
          <p className="text-base font-semibold text-zinc-950">{metric.value}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700">{metric.detail}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{metric.note}</p>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-zinc-100 px-3 py-2.5">
          <span className="min-w-0 truncate text-sm text-zinc-600 blur-[6px] select-none" aria-hidden>
            {metric.value}
          </span>
          <button type="button" onClick={onUnlock} className="shrink-0 text-sm font-semibold text-mojo-ink">
            Email to unlock
          </button>
        </div>
      )}
    </article>
  );
}

function GapSection({
  report,
  gaps,
  filter,
  onFilter,
  callHref,
  onCall,
}: {
  report: ScoreReport;
  gaps: ScoreReport["gaps"];
  filter: Filter;
  onFilter: (filter: Filter) => void;
  callHref: string;
  onCall: () => void;
}) {
  const goalHint: Record<Goal, string> = {
    exit: "You scored this for an exit.",
    family: "You scored this for family time.",
    absentee: "You scored this for time away.",
    chaos: "You scored this for a calmer week.",
  };
  return (
    <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold tracking-tight">Top gaps (fix these first)</h2>
      <p className="mt-1 text-sm text-zinc-500">{goalHint[report.goal]} The first two were visible before email.</p>
      {gaps.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">Nothing in this view. Try All.</p>
      ) : (
        <ol className="mt-4 space-y-2 text-[15px] text-zinc-900">
          {gaps.map((gap, index) => (
            <li key={gap.id}>
              {index + 1}. {gap.title}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500">Filter view:</span>
          <FilterButton current={filter} id="all" onFilter={onFilter}>
            All
          </FilterButton>
          <FilterButton current={filter} id="critical" onFilter={onFilter}>
            Critical only
          </FilterButton>
          <FilterButton current={filter} id="quick" onFilter={onFilter}>
            Quick wins
          </FilterButton>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={SITE.writer}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Fix gap #1 in Writer
          </a>
          <a
            href={callHref}
            onClick={onCall}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-950 bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-50"
          >
            Request a call
          </a>
          <a
            href={SITE.studio}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-50"
          >
            Open Studio
          </a>
          <a
            href={SITE.builderPro}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-50"
          >
            Builder Pro
          </a>
        </div>
      </div>
    </section>
  );
}

function FilterButton({
  current,
  id,
  onFilter,
  children,
}: {
  current: Filter;
  id: Filter;
  onFilter: (filter: Filter) => void;
  children: string;
}) {
  const active = current === id;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onFilter(id)}
      className={`inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold ${
        active ? "bg-zinc-950 text-white" : "border border-zinc-300 bg-white text-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
