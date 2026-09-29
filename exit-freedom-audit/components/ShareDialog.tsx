"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isEmail, normalizeEmail } from "@/lib/email";
import type { ShareSummary } from "@/lib/score";

export function ShareDialog({
  summary,
  replyTo,
  onClose,
}: {
  summary: ShareSummary;
  replyTo?: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState("");

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
    const to = normalizeEmail(email);
    if (!isEmail(to)) {
      setError("Enter a valid Ops email, like ops@company.com.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, replyTo, summary }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.error || "We couldn't send that email. Try again.");
        return;
      }
      setSentTo(to);
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
          Email Ops team
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Sends your {summary.score}/100 score, the top gaps, and the directional breakout. The SOP
          Mojo footer stays on the email.
        </p>
        {sentTo ? (
          <div className="mt-5">
            <p className="text-sm font-medium text-zinc-950" role="status">
              Sent to {sentTo}.
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
          <form onSubmit={onSubmit} className="mt-5" noValidate>
            <label htmlFor="ops-email" className="text-sm font-semibold text-zinc-800">
              Teammate email
            </label>
            <input
              ref={inputRef}
              id="ops-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="ops@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-base outline-none focus:border-zinc-950"
            />
            {error ? (
              <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                {pending ? "Sending…" : "Send score"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
