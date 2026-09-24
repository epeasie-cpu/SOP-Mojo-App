import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageHeader } from "@/components/Article";
import { PageShell } from "@/components/JsonLd";
import { getEntry, searchContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/search");

export const metadata: Metadata = buildMetadata(entry);

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const results = searchContent(q);
  return (
    <PageShell className="py-12">
      <JsonLd entry={entry} />
      <PageHeader entry={entry} />
      <form method="get" action="/search" className="max-w-xl">
        <label className="block text-sm font-medium">
          Search pages
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="onboarding, housekeeping, template…"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-lime"
          />
        </label>
        <button
          type="submit"
          className="mt-3 rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink hover:bg-lime/90"
        >
          Search
        </button>
      </form>
      <ul className="mt-8 space-y-3">
        {results.map((item) => (
          <li key={item.path} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <Link href={item.path} className="font-semibold hover:underline">
              {item.heading}
            </Link>
            <p className="mt-1 text-sm text-muted">{item.description}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
