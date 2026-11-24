"use client";

import { useState } from "react";
import { useSopDraft } from "@/components/SopDraftContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[\p{L}][\p{L}\p{M}'’.\- ]{0,39}$/u;

export function TemplateLeadForm({
  slug,
  footerLines,
}: {
  slug: string;
  footerLines: string[];
}) {
  const draftState = useSopDraft();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [honey, setHoney] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const ready =
    !busy &&
    NAME_RE.test(firstName.trim()) &&
    EMAIL_RE.test(email.trim()) &&
    consent;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/template-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          slug,
          company_website: honey,
          ...(draftState?.draft ? { draft: draftState.draft } : {}),
        }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.error || "We couldn't send that template. Check the address and try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("We couldn't send that template. Check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="no-print mt-12 rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      <h2 className="font-display text-2xl font-semibold text-zinc-50">
        Email me this template (Word-ready + checklist)
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Optional. The template above stays on the page either way. We will send the template,
        and the draft from the writer if you have generated one.
      </p>
      {sent ? (
        <p className="mt-4 text-sm text-lime" role="status">
          Sent. Check your inbox for the template.
        </p>
      ) : (
        <form className="mt-4 grid max-w-md gap-3" onSubmit={(event) => void onSubmit(event)}>
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="company-website">Company website</label>
            <input
              id="company-website"
              name="company_website"
              tabIndex={-1}
              autoComplete="off"
              value={honey}
              onChange={(event) => setHoney(event.target.value)}
            />
          </div>
          <label className="block text-sm font-medium text-zinc-200" htmlFor="template-first-name">
            First name
            <input
              id="template-first-name"
              name="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-normal text-zinc-100 outline-none focus:border-lime"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200" htmlFor="template-email">
            Email
            <input
              id="template-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-normal text-zinc-100 outline-none focus:border-lime"
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-zinc-300" htmlFor="template-consent">
            <input
              id="template-consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1"
              required
            />
            <span>Email me this template and add me to the SOP Mojo list. I can unsubscribe any time.</span>
          </label>
          {error ? (
            <p className="text-sm text-amber-200" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!ready}
            className="w-full rounded-sm bg-lime px-4 py-2.5 text-sm font-semibold text-lime-ink hover:bg-lime/90 disabled:opacity-60 sm:w-auto"
          >
            {busy ? "Sending…" : "Email me this template"}
          </button>
        </form>
      )}
      <p className="mt-4 text-xs leading-5 text-zinc-500">
        {footerLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
    </section>
  );
}
