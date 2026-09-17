import Link from "next/link";
import { ArticleSections, PageHeader } from "@/components/Article";
import { CtaRow } from "@/components/CtaRow";
import { FaqList } from "@/components/FaqList";
import { JsonLd, PageShell } from "@/components/JsonLd";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingChrome";
import type { ContentEntry } from "@/lib/content";
import { indexedContent } from "@/lib/content";

export function MarketingPage({ entry }: { entry: ContentEntry }) {
  const related = indexedContent().filter(
    (item) => item.path !== entry.path && item.type === "page",
  );
  return (
    <>
      <MarketingHeader />
      <PageShell className="py-12">
        <JsonLd entry={entry} />
        <PageHeader entry={entry} />
        <ArticleSections entry={entry} />
        {entry.howTo ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">Step-by-step</h2>
            <ol className="mt-4 space-y-4">
              {entry.howTo.steps.map((step, index) => (
                <li key={step.name} className="rounded-lg border border-line bg-white p-4">
                  <p className="text-xs font-semibold tracking-wide text-forest uppercase">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 font-semibold">{step.name}</p>
                  <p className="mt-1 text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {entry.faqs?.length ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">FAQ</h2>
            <div className="mt-4">
              <FaqList faqs={entry.faqs} />
            </div>
          </section>
        ) : null}
        {related.length ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">More from Client Systems</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className="block rounded-lg border border-line bg-white p-4 hover:border-forest"
                  >
                    <p className="font-semibold">{item.heading}</p>
                    <p className="mt-1 text-sm text-muted">{item.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="mt-12">
          <CtaRow />
        </div>
      </PageShell>
      <MarketingFooter />
    </>
  );
}
