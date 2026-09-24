import type { Metadata } from "next";
import Link from "next/link";
import { ArticleSections } from "@/components/Article";
import { CtaRow } from "@/components/CtaRow";
import { FaqList } from "@/components/FaqList";
import { Generator } from "@/components/Generator";
import { JsonLd } from "@/components/JsonLd";
import { PageShell } from "@/components/JsonLd";
import { getEntry, getUseCaseEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { SITE, hostLabel } from "@/lib/site";

const entry = getEntry("/");

export const metadata: Metadata = buildMetadata(entry);

export default function HomePage() {
  const useCases = getUseCaseEntries();
  return (
    <>
      <JsonLd entry={entry} />
      <section className="border-b border-zinc-800">
        <PageShell className="grid gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">
              {hostLabel(SITE.host)}
            </p>
            <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
              AI SOP Writer
            </h1>
            <p className="mt-4 max-w-xl text-lg text-zinc-400">
              {entry.heading}. SOP means standard operating procedure — not
              statement of purpose. Review the draft with the process owner
              before you train anyone.
            </p>
            <ul className="mt-6 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
              {[
                "Purpose",
                "Owner",
                "Trigger",
                "Tools",
                "KPI",
                "Steps",
                "Exceptions",
                "Checklist + safety notes",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Generator outputSlotId="sop-output-slot" />
        </PageShell>
      </section>
      <div id="sop-output-slot" className="mx-auto w-full max-w-6xl px-4 sm:px-6" />
      <PageShell className="py-12">
        <ArticleSections entry={entry} />
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-zinc-50">Use cases</h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Start from a job that is currently trapped in someone’s head.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => (
              <li key={item.path} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
                <h3 className="font-semibold">
                  <Link href={item.path} className="hover:underline">
                    {item.heading}
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-muted">{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
        {entry.faqs ? (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold text-zinc-50">FAQ</h2>
            <div className="mt-4">
              <FaqList faqs={entry.faqs} />
            </div>
          </section>
        ) : null}
        <div className="mt-12">
          <CtaRow />
        </div>
      </PageShell>
    </>
  );
}
