import type { Metadata } from "next";
import Link from "next/link";
import { ArticleSections } from "@/components/Article";
import { CtaRow } from "@/components/CtaRow";
import { FaqList } from "@/components/FaqList";
import { JsonLd, PageShell } from "@/components/JsonLd";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingChrome";
import { getEntry, indexedContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { hostLabel } from "@/lib/site";

const entry = getEntry("/");

export const metadata: Metadata = buildMetadata(entry);

export default function HomePage() {
  const pages = indexedContent().filter((item) => item.type === "page");
  return (
    <>
      <MarketingHeader />
      <JsonLd entry={entry} />
      <section className="border-b border-line bg-forest text-white">
        <PageShell className="py-14">
          <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">
            {hostLabel()}
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Client Systems
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">{entry.lede}</p>
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
            <Link
              href="/how-it-works"
              className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white hover:border-lime"
            >
              How it works
            </Link>
          </div>
        </PageShell>
      </section>
      <PageShell className="py-12">
        <ArticleSections entry={{ ...entry, lede: undefined }} />
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold">Guides</h2>
          <p className="mt-2 max-w-2xl text-muted">
            High-intent pages for the kit and the workspace. Sales may refine
            keywords; these slugs are the v1 set.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {pages.map((item) => (
              <li key={item.path} className="rounded-lg border border-line bg-white p-5">
                <h3 className="font-semibold">
                  <Link href={item.path} className="hover:underline">
                    {item.keyword}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
        {entry.faqs ? (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold">FAQ</h2>
            <div className="mt-4">
              <FaqList faqs={entry.faqs} />
            </div>
          </section>
        ) : null}
        <div className="mt-14">
          <CtaRow />
        </div>
      </PageShell>
      <MarketingFooter />
    </>
  );
}
