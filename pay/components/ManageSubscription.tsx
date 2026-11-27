"use client";

import Link from "next/link";
import { useState } from "react";
import { PORTAL_OPEN_FAILED } from "@/lib/portal";

export function ManageSubscription({ email }: { email: string | null }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (!email) {
    return (
      <Link
        href="/account"
        className="inline-flex min-h-14 w-full items-center justify-center rounded-sm border border-zinc-700 px-4 text-center text-base font-semibold text-zinc-100"
      >
        Manage or cancel this subscription
      </Link>
    );
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setMessage("");
          void fetch("/api/portal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
            .then(async (response) => {
              const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
              if (!response.ok || !body.url) {
                setMessage(body.error || PORTAL_OPEN_FAILED);
                return;
              }
              window.location.href = body.url;
            })
            .catch(() => setMessage(PORTAL_OPEN_FAILED))
            .finally(() => setPending(false));
        }}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-sm border border-zinc-700 px-4 text-center text-base font-semibold text-zinc-100 disabled:opacity-60"
      >
        {pending ? "Opening…" : "Manage or cancel this subscription"}
      </button>
      {message ? (
        <p className="text-sm leading-6 text-amber-200" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
