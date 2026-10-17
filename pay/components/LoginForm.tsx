"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ error }: { error?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(error === "link" ? "That sign-in link expired. Request a new one." : "");
  const [pending, setPending] = useState(false);

  async function submit(body: { code?: string; email?: string }) {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setMessage(payload.error || "Could not sign in.");
      return;
    }
    if (body.email) {
      setMessage("If that email is on the allowlist, the sign-in link is on its way.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-display text-4xl font-semibold">Catalog sign-in</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Use the access code from the project settings, or email yourself a link if that inbox is on the allowlist.
      </p>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit({ code });
        }}
      >
        <label className="text-sm font-medium" htmlFor="access-code">
          Access code
        </label>
        <input
          id="access-code"
          type="password"
          autoComplete="current-password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-h-12 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base"
        />
        <button
          type="submit"
          disabled={pending || !code}
          className="min-h-12 rounded-sm bg-lime font-semibold text-lime-ink disabled:opacity-60"
        >
          Sign in
        </button>
      </form>
      <form
        className="mt-8 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit({ email });
        }}
      >
        <label className="text-sm font-medium" htmlFor="magic-email">
          Email me a link
        </label>
        <input
          id="magic-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-12 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base"
        />
        <button
          type="submit"
          disabled={pending || !email}
          className="min-h-12 rounded-sm border border-zinc-600 font-semibold disabled:opacity-60"
        >
          Send link
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-zinc-200" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
