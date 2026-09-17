import { BUILDER_CTA_URL, SITE, WRITER_CTA_URL, hostLabel } from "@/lib/site";

export function CtaRow() {
  return (
    <section className="rounded-xl bg-black px-6 py-8 text-white">
      <p className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">
        SOP Mojo products
      </p>
      <h2 className="font-display mt-2 text-2xl font-semibold">
        Run onboarding here. Draft SOPs in Writer. Keep them alive in Builder Pro.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-white/75">
        Client Systems is client onboarding systems for SMBs — not a Notion
        marketplace, not ClickUp. Writer, Builder Pro, and the SOP Library stay
        on their own hosts.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="/signup"
          className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink"
        >
          Create a workspace
        </a>
        <a
          href={WRITER_CTA_URL}
          className="rounded-sm border border-white/20 px-4 py-2 text-sm hover:border-lime"
        >
          AI SOP Writer
        </a>
        <a
          href={BUILDER_CTA_URL}
          className="rounded-sm border border-white/20 px-4 py-2 text-sm hover:border-lime"
        >
          SOP Builder Pro
        </a>
        <a
          href={SITE.library}
          className="rounded-sm border border-white/20 px-4 py-2 text-sm hover:border-lime"
        >
          SOP Library
        </a>
        <a
          href={SITE.parent}
          className="rounded-sm border border-white/20 px-4 py-2 text-sm hover:border-lime"
        >
          {hostLabel(SITE.parent)}
        </a>
      </div>
    </section>
  );
}
