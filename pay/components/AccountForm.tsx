"use client";

import { useState } from "react";

export function AccountForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="font-display text-4xl font-semibold">Update your card</h1>
      <p className="mt-3 text-base leading-7 text-zinc-400">
        Use the email from checkout. Stripe opens its customer portal. You do not need a Stripe customer id.
      </p>
      <form
        className="mt-6 grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setMessage("");
          const response = await fetch("/api/portal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string; blocker?: string };
          setPending(false);
          if (!response.ok || !body.url) {
            setMessage(body.blocker || body.error || "Could not open the portal.");
            return;
          }
          window.location.href = body.url;
        }}
      >
        <label className="text-sm font-medium" htmlFor="portal-email">
          Email
        </label>
        <input
          id="portal-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-12 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base"
        />
        <button type="submit" disabled={pending} className="min-h-12 rounded-sm bg-lime font-semibold text-lime-ink disabled:opacity-60">
          {pending ? "Opening…" : "Open Stripe portal"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm leading-6 text-amber-200" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
