"use client";

import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSopModal({
  open,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  if (!open) return null;
  const trimmed = email.trim();
  const ready = !busy && EMAIL_RE.test(trimmed);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="writer-email-sop-title"
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-lime uppercase">Email</p>
        <h2 id="writer-email-sop-title" className="font-display mt-2 text-2xl font-semibold text-zinc-50">
          Enter email to get your SOP in your inbox
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          Generate and review stay free. We will email this draft to you, then finish the copy,
          download, or print on this page.
        </p>
        <form
          className="mt-4 grid gap-2"
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready) return;
            onSubmit(trimmed);
          }}
        >
          <label className="text-xs text-zinc-400" htmlFor="writer-email">
            Email
          </label>
          <input
            id="writer-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-sm border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-lime"
          />
          {error ? (
            <p className="text-sm text-amber-200" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!ready}
            className="mt-2 rounded-sm bg-lime px-3 py-2 text-sm font-semibold text-lime-ink disabled:opacity-40"
          >
            {busy ? "Sending…" : "Email me this SOP"}
          </button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
          onClick={onClose}
          disabled={busy}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
