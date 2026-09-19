"use client";

import { useRef, useState } from "react";
import { UNLOCK_COPY } from "@/lib/entitlements";
import { builderCheckoutUrl, flowchartCheckoutUrl } from "@/lib/site";

export function UnlockModal({
  open,
  detail,
  onClose,
  onUnlockBrowser,
}: {
  open: boolean;
  detail: string;
  onClose: () => void;
  onUnlockBrowser: (source: "standalone" | "builder-pro") => void;
}) {
  const flowchartUrl = flowchartCheckoutUrl();
  const builderUrl = builderCheckoutUrl();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-title"
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-lime uppercase">
          Freemium
        </p>
        <h2 id="unlock-title" className="font-display mt-2 text-2xl font-semibold text-zinc-50">
          {UNLOCK_COPY.headline}
        </h2>
        <p className="mt-3 text-sm text-zinc-400">{detail}</p>
        <p className="mt-3 text-sm text-zinc-400">
          Free covers create and iterate. Print, export, and Send to Builder Pro need unlock.
        </p>
        <div className="mt-5 grid gap-2">
          {flowchartUrl ? (
            <a
              href={flowchartUrl}
              className="rounded-sm bg-lime px-4 py-2.5 text-center text-sm font-semibold text-lime-ink hover:bg-lime/90"
            >
              Unlock $19
            </a>
          ) : (
            <button
              type="button"
              className="rounded-sm bg-lime px-4 py-2.5 text-sm font-semibold text-lime-ink hover:bg-lime/90"
              onClick={() => onUnlockBrowser("standalone")}
            >
              Unlock $19
            </button>
          )}
          <a
            href={builderUrl}
            className="rounded-sm border border-lime/40 px-4 py-2.5 text-center text-sm font-semibold text-lime hover:bg-lime/10"
          >
            Builder Pro $47 includes flowchart + import
          </a>
          <button
            type="button"
            className="text-sm text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
            onClick={() => onUnlockBrowser("standalone")}
          >
            Already purchased? Unlock this browser
          </button>
          <button
            type="button"
            className="text-xs text-zinc-600 hover:text-zinc-400"
            onClick={() => onUnlockBrowser("builder-pro")}
          >
            I have Builder Pro
          </button>
        </div>
        <button
          type="button"
          className="mt-5 text-sm text-zinc-500 hover:text-zinc-300"
          onClick={onClose}
        >
          Keep editing free
        </button>
      </div>
    </div>
  );
}

export function UnlockHint({ onOpen }: { onOpen: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (dismissed) return null;
  return (
    <div
      ref={ref}
      className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-400"
    >
      <p>
        <span className="font-semibold text-lime">Unlock $19</span>
        {" · "}
        Builder Pro $47 includes flowchart + import
      </p>
      <div className="flex items-center gap-3">
        <button type="button" className="font-semibold text-lime hover:underline" onClick={onOpen}>
          Unlock
        </button>
        <button type="button" className="text-zinc-600" onClick={() => setDismissed(true)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
