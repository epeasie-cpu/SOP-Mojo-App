import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingChrome";
import { marketingMetadata } from "@/lib/seo";
import { BUILDER_CTA_URL, SITE, WRITER_CTA_URL, hostLabel } from "@/lib/site";

export const metadata: Metadata = marketingMetadata({
  keyword: "Client onboarding workspace",
  description: SITE.tagline,
  path: "/",
  index: true,
});

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <section className="border-b border-line bg-forest text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">
            {hostLabel()}
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Client Systems
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            The SOP Mojo product workspace for the Client Systems Kit. Invite
            the team, run intake, complete the sales-to-delivery handoff, and
            operate the onboarding board in the browser — not in Notion,
            ClickUp, or a duplicated Airtable.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink"
            >
              Create a workspace
            </Link>
            <Link
              href="/login"
              className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white hover:border-lime"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
        {[
          {
            title: "Intake lives here",
            body: "Capture the client, commercial facts, brand-kit status, and success metric in one record.",
          },
          {
            title: "Handoff is a gate",
            body: "Account lead and delivery lead both confirm. Complete seeds the 31-task onboarding board.",
          },
          {
            title: "Access has an SLA",
            body: "Later items get a deadline. Overdue access creates a blocked task for the account lead.",
          },
        ].map((item) => (
          <article key={item.title} className="rounded-lg border border-line bg-white p-5">
            <h2 className="font-display text-xl font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-muted">{item.body}</p>
          </article>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <section className="rounded-xl bg-black px-6 py-8 text-white">
          <p className="text-xs font-semibold tracking-[0.16em] text-lime uppercase">
            SOP Mojo products
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold">
            Onboarding here. Drafts in Writer. Living SOPs in Builder Pro.
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={WRITER_CTA_URL}
              className="rounded-sm border border-white/20 px-4 py-2 text-sm hover:border-lime"
            >
              AI SOP Writer
            </a>
            <a
              href={BUILDER_CTA_URL}
              className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink"
            >
              SOP Builder Pro
            </a>
            <a
              href={SITE.parent}
              className="rounded-sm border border-white/20 px-4 py-2 text-sm hover:border-lime"
            >
              {hostLabel(SITE.parent)}
            </a>
          </div>
        </section>
      </div>
      <MarketingFooter />
    </>
  );
}
