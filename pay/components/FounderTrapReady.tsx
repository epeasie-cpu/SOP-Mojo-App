import {
  BLUEPRINT_UPSELL,
  BLUEPRINT_UPSELL_URL,
  FOUNDER_TRAP_BLUEPRINT_UPSELL,
  FOUNDER_TRAP_BLUEPRINT_UPSELL_URL,
} from "@/lib/downloads";
import { FOUNDER_TRAP_EMAILED, FOUNDER_TRAP_SPAM } from "@/lib/founder-trap";

export function FounderTrapReady({ token }: { token: string | null }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-zinc-50" role="status">
          Your Escape the Founder Trap guide is ready.
        </h1>
        {token ? (
          <a
            href={`/download/${token}`}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-lime px-4 text-center text-base font-semibold text-lime-ink"
          >
            Download the guide
          </a>
        ) : null}
        <p className="mt-4 text-base text-zinc-200">{token ? "We also emailed your download link." : FOUNDER_TRAP_EMAILED}</p>
        <p className="mt-2 text-base text-zinc-200">{FOUNDER_TRAP_SPAM}</p>
        <aside className="mt-8 rounded-lg border border-lime bg-zinc-900 p-4">
          <p className="text-lg font-semibold leading-7 text-zinc-50">{FOUNDER_TRAP_BLUEPRINT_UPSELL}</p>
          <a
            href={FOUNDER_TRAP_BLUEPRINT_UPSELL_URL}
            className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-lime px-4 text-center text-base font-semibold text-lime-ink"
          >
            Get the Blueprint
          </a>
        </aside>
        <aside className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <p className="text-lg font-semibold leading-7 text-zinc-50">{BLUEPRINT_UPSELL}</p>
          <a
            href={BLUEPRINT_UPSELL_URL}
            className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-sm border border-lime px-4 text-center text-base font-semibold text-lime"
          >
            Get Builder Pro
          </a>
        </aside>
      </article>
    </div>
  );
}
