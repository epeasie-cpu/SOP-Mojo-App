import type { Metadata } from "next";
import { AUP_FREE_HEADLINE, freeAupErrorMessage } from "@/lib/aup-free";
import { requestFreeAup } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${AUP_FREE_HEADLINE} | SOP Mojo`,
  description: "Get the free Acceptable Use Policy Generator. We email your access link.",
};

export default async function FreeAupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const error = freeAupErrorMessage(query.error);
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{AUP_FREE_HEADLINE}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Enter your email and we will send your access link.
        </p>
        <form action={requestFreeAup} className="mt-6 grid gap-4">
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor="firstName">
              First name <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              className="min-h-14 rounded-sm border border-zinc-700 bg-zinc-900 px-3 text-base"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="min-h-14 rounded-sm bg-lime font-semibold text-lime-ink">
            {AUP_FREE_HEADLINE}
          </button>
        </form>
      </article>
    </div>
  );
}
