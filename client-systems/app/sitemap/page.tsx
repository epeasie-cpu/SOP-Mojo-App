import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, PageShell } from "@/components/JsonLd";
import { PageHeader } from "@/components/Article";
import { MarketingFooter, MarketingHeader } from "@/components/MarketingChrome";
import { getEntry, indexedContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/sitemap");

export const metadata: Metadata = buildMetadata(entry);

export default function HtmlSitemapPage() {
  const pages = indexedContent();
  return (
    <>
      <MarketingHeader />
      <PageShell className="py-12">
        <JsonLd entry={entry} />
        <PageHeader entry={entry} />
        <p className="max-w-2xl text-muted">
          Crawlable HTML sitemap for Client Systems. XML index:{" "}
          <a className="underline" href="/sitemap.xml">
            /sitemap.xml
          </a>
          . App routes under <code>/app</code> are noindex.
        </p>
        <ul className="mt-8 space-y-2">
          {pages.map((item) => (
            <li key={item.path}>
              <Link href={item.path} className="font-medium underline-offset-2 hover:underline">
                {item.heading}
              </Link>
              <span className="text-muted"> — {item.path}</span>
            </li>
          ))}
        </ul>
      </PageShell>
      <MarketingFooter />
    </>
  );
}
