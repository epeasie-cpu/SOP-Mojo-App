"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isEmail, normalizeEmail } from "@/lib/email";
import type { ShareSummary } from "@/lib/score";

export function CallRequestDialog({
  summary,
  defaultEmail,
  onClose,
}: {
  summary?: ShareSummary;
  defaultEmail?: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextEmail = normalizeEmail(email);
    if (!isEmail(nextEmail)) {
      setError("Enter a valid email.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/call-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nextEmail,
          name: name.trim(),
          note: note.trim(),
          summary,
        }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.error || "We couldn't send that request. Try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

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
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Tell SOP Mojo you want to discuss how to document your workflows. Your score summary is
          included when it is available.
        </p>
        {sent ? (
          <div className="mt-5">
            <p className="text-sm font-medium text-zinc-950" role="status">
              Request sent. We will follow up at {normalizeEmail(email)}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
            <div>
              <label htmlFor="call-name" className="text-sm font-semibold text-zinc-800">
                Name
              </label>
              <input
                ref={inputRef}
                id="call-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-base outline-none focus:border-zinc-950"
              />
            </div>
            <div>
              <label htmlFor="call-email" className="text-sm font-semibold text-zinc-800">
                Email
              </label>
              <input
                id="call-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-base outline-none focus:border-zinc-950"
              />
            </div>
            <div>
              <label htmlFor="call-note" className="text-sm font-semibold text-zinc-800">
                What should we discuss?
              </label>
              <textarea
                id="call-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-base outline-none focus:border-zinc-950"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Sending…" : "Request a call"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
