"use client";

import { useCallback, type ChangeEvent } from "react";
import type { PremiumAction, UnlockState } from "@/lib/entitlements";
import { UNLOCK_COPY } from "@/lib/entitlements";
import type { FlowGraph } from "@/lib/graph";

export function Toolbar({
  graph,
  modeLabel,
  unlock,
  busy,
  onTitle,
  onPremium,
  onDemo,
}: {
  graph: FlowGraph;
  modeLabel: string;
  unlock: UnlockState;
  busy: boolean;
  onTitle: (title: string) => void;
  onPremium: (action: PremiumAction) => void;
  onDemo: () => void;
}) {
  const onChangeTitle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onTitle(event.target.value),
    [onTitle],
  );

  return (
    <div className="no-print flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-950/90 px-3 py-2 sm:px-4">
      <input
        value={graph.title}
        onChange={onChangeTitle}
        aria-label="Flowchart title"
        className="font-display min-w-[12rem] flex-1 bg-transparent text-lg font-semibold text-zinc-50 outline-none"
      />
      <p className="hidden text-[11px] tracking-[0.12em] text-zinc-500 uppercase sm:block">
        {modeLabel}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onDemo}
        className="rounded-sm border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-lime"
      >
        Load demo
      </button>
      <button
        type="button"
        onClick={() => onPremium("print")}
        className="rounded-sm border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-lime"
      >
        Print
      </button>
      <button
        type="button"
        onClick={() => onPremium("export")}
        className="rounded-sm border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-lime"
      >
        Export
      </button>
      <button
        type="button"
        onClick={() => onPremium("send")}
        className="rounded-sm bg-lime px-2.5 py-1.5 text-xs font-semibold text-lime-ink"
      >
        Send to Builder Pro
      </button>
      {unlock.unlocked ? (
        <span className="text-[11px] text-lime">Unlocked</span>
      ) : (
        <span className="hidden text-[11px] text-zinc-500 lg:inline">{UNLOCK_COPY.standalone}</span>
      )}
    </div>
  );
}
