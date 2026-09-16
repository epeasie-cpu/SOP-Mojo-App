import Link from "next/link";
import { ArticleSections, PageHeader } from "@/components/Article";
import { CtaRow } from "@/components/CtaRow";
import { FaqList } from "@/components/FaqList";
import { Generator } from "@/components/Generator";
import { JsonLd } from "@/components/JsonLd";
import { PageShell } from "@/components/JsonLd";
import type { ContentEntry } from "@/lib/content";
import { getUseCaseEntries } from "@/lib/content";

export function MarketingPage({
  entry,
  showGenerator = false,
}: {
  entry: ContentEntry;
  showGenerator?: boolean;
}) {
  const useCases = getUseCaseEntries();
  return (
    <PageShell className="py-12">
      <JsonLd entry={entry} />
      <PageHeader entry={entry} />
      {showGenerator ? (
        <div className="mb-12">
          <Generator defaults={entry.prefill} />
        </div>
      ) : null}
      <ArticleSections entry={entry} />
      {entry.path === "/use-cases" ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {useCases.map((item) => (
            <li key={item.path} className="rounded-lg border border-line bg-white p-5">
              <h2 className="font-display text-xl font-semibold">
                <Link href={item.path} className="hover:underline">
                  {item.heading}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {entry.path === "/vs/sop-builder-pro" ? <ComparisonTable /> : null}
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
      <div className="mt-12">
        <CtaRow />
      </div>
    </PageShell>
  );
}

function ComparisonTable() {
  const rows = [
    ["Job", "First-draft standard operating procedure", "Living SOP system the team can run"],
    ["Output", "Purpose, owner, trigger, tools, KPI, steps, exceptions, checklist, safety notes", "Owned procedures with revisions, training, and floor-ready access"],
    ["Best moment", "The job is still in someone’s head", "The draft has been reviewed and must stay true"],
    ["Training", "Do not train from an unreviewed draft", "Train from the current owned version"],
    ["Host", "writer.sopmojo.com", "builder.sopmojo.com"],
  ];
  return (
    <section className="mt-12 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-white">
            <th className="p-3"> </th>
            <th className="p-3">AI SOP Writer</th>
            <th className="p-3">SOP Builder Pro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-line align-top">
              {row.map((cell) => (
                <td key={cell} className="p-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
