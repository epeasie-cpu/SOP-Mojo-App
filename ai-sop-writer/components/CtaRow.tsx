import { SITE, WRITER_UPGRADE_URL, hostLabel } from "@/lib/site";

export function CtaRow() {
  return (
    <section className="no-print rounded-xl bg-black px-6 py-8 text-white">
      <p className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">
        After the draft
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold">
        A first draft is the start. The living system is SOP Builder Pro.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-white/75">
        AI SOP Writer gets the procedure out of someone’s head. SOP Builder Pro
        keeps ownership, KPIs, and revisions in a system your team can actually
        run. Parent company and library live on SOP Mojo.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={WRITER_UPGRADE_URL}
          className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink"
        >
          Get Builder Pro
        </a>
        <a
          href={SITE.builder}
          className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white hover:border-lime"
        >
          Living system
        </a>
        <a
          href={SITE.library}
          className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white hover:border-lime"
        >
          SOP Library
        </a>
        <a
          href={SITE.parent}
          className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white hover:border-lime"
        >
          {hostLabel(SITE.parent)}
        </a>
      </div>
    </section>
  );
}
