import type { Metadata } from "next";
import { AUP_FREE_EMAIL_LEAD, AUP_FREE_SPAM, AUP_FREE_UPSELL, BUILDER_PRO_GO } from "@/lib/aup-free";

export const metadata: Metadata = {
  title: "Your AUP Generator access link is on its way | SOP Mojo",
  description: AUP_FREE_EMAIL_LEAD,
};

export default function FreeAupReadyPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-zinc-50" role="status">
          {AUP_FREE_EMAIL_LEAD}
        </h1>
        <p className="mt-4 text-base text-zinc-200">{AUP_FREE_SPAM}</p>
        <aside className="mt-8 rounded-lg border border-lime bg-zinc-900 p-4">
          <p className="text-lg font-semibold leading-7 text-zinc-50">{AUP_FREE_UPSELL}</p>
          <a
            href={BUILDER_PRO_GO}
            className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-lime px-4 text-center text-base font-semibold text-lime-ink"
          >
            Get Builder Pro
          </a>
        </aside>
      </article>
    </div>
  );
}
