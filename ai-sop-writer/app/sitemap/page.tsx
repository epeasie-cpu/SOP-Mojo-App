import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/Article";
import { PageShell } from "@/components/JsonLd";
import { getEntry, indexedContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/sitemap");

export const metadata: Metadata = buildMetadata(entry);

export default function HtmlSitemapPage() {
  const pages = indexedContent().filter((item) => item.type !== "use-case");
  const useCases = indexedContent().filter((item) => item.type === "use-case");
  return (
    <PageShell className="py-12">
      <JsonLd entry={entry} />
      <PageHeader entry={entry} />
      <p className="max-w-2xl text-muted">
        Crawlable HTML sitemap for AI SOP Writer. XML index:{" "}
        <a className="underline" href="/sitemap.xml">
          /sitemap.xml
        </a>
        .
      </p>
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-zinc-50">Pages</h2>
        <ul className="mt-3 space-y-2">
          {pages.map((item) => (
            <li key={item.path}>
              <Link href={item.path} className="font-medium underline-offset-2 hover:underline">
                {item.heading}
              </Link>
              <span className="text-muted"> — {item.path}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-zinc-50">Use cases</h2>
        <ul className="mt-3 space-y-2">
          {useCases.map((item) => (
            <li key={item.path}>
              <Link href={item.path} className="font-medium underline-offset-2 hover:underline">
                {item.heading}
              </Link>
              <span className="text-muted"> — {item.path}</span>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
