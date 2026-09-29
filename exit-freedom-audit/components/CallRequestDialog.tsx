"use client";

import { useEffect, useId, useRef } from "react";
import { CALL_TO } from "@/lib/call-mailto";

export function CallRequestDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-xl font-bold tracking-tight">
          Request a call
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-800">
          Someone on the SOP Mojo team will be in touch soon.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Send the email that opened. It is addressed to {CALL_TO} and includes your score, band, and
          top gaps.
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
