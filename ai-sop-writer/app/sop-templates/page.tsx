import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/Article";
import { CtaRow } from "@/components/CtaRow";
import { JsonLd, PageShell } from "@/components/JsonLd";
import { getEntry, type ContentEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { templatesByGroup } from "@/lib/templates";

const entry = getEntry("/sop-templates");

export const metadata: Metadata = buildMetadata(entry);

function TemplateGroup({ title, items }: { title: string; items: ContentEntry[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold text-zinc-50">{title}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.path} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="font-display text-xl font-semibold">
              <Link href={item.path} className="hover:underline">
                {item.keyword}
              </Link>
            </h3>
            <p className="mt-2 text-sm text-muted">{item.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SopTemplatesPage() {
  const groups = templatesByGroup();
  return (
    <PageShell className="py-12">
      <JsonLd entry={entry} />
      <PageHeader entry={entry} />
      {entry.lede ? <p className="max-w-2xl text-lg text-zinc-300">{entry.lede}</p> : null}
      <TemplateGroup title="By industry" items={groups.industry} />
      <TemplateGroup title="By function" items={groups.function} />
      <div className="mt-12">
        <CtaRow />
      </div>
    </PageShell>
  );
}
