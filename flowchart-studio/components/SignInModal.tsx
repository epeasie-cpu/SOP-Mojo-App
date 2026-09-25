"use client";

import { useState } from "react";
import {
  signInWithBuilder,
  signUpWithBuilder,
  supabasePublicConfig,
  persistSession,
  type ClientSession,
} from "@/lib/session";

export function SignInModal({
  open,
  purpose,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  purpose: "export" | "library" | "purchase";
  onClose: () => void;
  onSignedIn: (session: ClientSession) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const configured = Boolean(supabasePublicConfig());

  async function submit(mode: "in" | "up") {
    setBusy(true);
    setError(null);
    try {
      const session =
        mode === "in"
          ? await signInWithBuilder(email.trim(), password)
          : await signUpWithBuilder(email.trim(), password);
      onSignedIn(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-lime uppercase">
          Builder Pro account
        </p>
        <h2 id="signin-title" className="font-display mt-2 text-2xl font-semibold text-zinc-50">
          Sign in
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          {purpose === "export"
            ? "Sign in with your Builder Pro account before exporting this map."
            : purpose === "purchase"
              ? "Sign in with the email on your Flowchart Plus or Builder Pro purchase. Creating an account does not unlock print or export."
              : "Sign in with your Builder Pro account to save this map to your library."}
        </p>
        {configured ? (
          <form
            className="mt-4 grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submit("in");
            }}
          >
            <label className="text-xs text-zinc-400" htmlFor="builder-email">
              Email
            </label>
            <input
              id="builder-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-sm border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-lime"
            />
            <label className="text-xs text-zinc-400" htmlFor="builder-password">
              Password
            </label>
            <input
              id="builder-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-sm border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-lime"
            />
            {error ? <p className="text-sm text-amber-200">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || !email.trim() || password.length < 6}
              className="mt-2 rounded-sm bg-lime px-3 py-2 text-sm font-semibold text-lime-ink disabled:opacity-40"
            >
              Sign in
            </button>
            {purpose === "purchase" ? null : (
              <button
                type="button"
                disabled={busy || !email.trim() || password.length < 6}
                onClick={() => void submit("up")}
                className="rounded-sm border border-zinc-600 px-3 py-2 text-sm text-zinc-300 disabled:opacity-40"
              >
                Create account
              </button>
            )}
          </form>
        ) : (
          <div className="mt-4 text-sm text-zinc-400">
            <p>
              This studio shares Builder Pro’s Supabase project. Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY to that project.
            </p>
            {error ? <p className="mt-2 text-amber-200">{error}</p> : null}
            {process.env.NODE_ENV !== "production" ? (
              <button
                type="button"
                className="mt-4 rounded-sm border border-zinc-600 px-3 py-2 text-sm text-zinc-200"
                onClick={() => {
                  const session: ClientSession = {
                    accessToken: "dev:local",
                    userId: "local",
                    email: "local@dev",
                  };
                  persistSession(session);
                  onSignedIn(session);
                }}
              >
                Continue with local dev account
              </button>
            ) : null}
          </div>
        )}
        <button
          type="button"
          className="mt-4 text-sm text-zinc-500 hover:text-zinc-300"
          onClick={onClose}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
