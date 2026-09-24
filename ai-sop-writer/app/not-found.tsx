import Link from "next/link";
import { PageShell } from "@/components/JsonLd";

export default function NotFound() {
  return (
    <PageShell className="py-20">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">Page not found</h1>
      <p className="mt-3 max-w-xl text-muted">
        That URL is not part of AI SOP Writer. Head home to generate a first-draft
        standard operating procedure, or use the HTML sitemap.
      </p>
      <p className="mt-6 flex gap-4">
        <Link href="/" className="rounded-sm bg-lime px-4 py-2 text-sm font-semibold text-lime-ink hover:bg-lime/90">
          AI SOP Writer home
        </Link>
        <Link href="/sitemap" className="rounded-sm border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-lime">
          Sitemap
        </Link>
      </p>
    </PageShell>
  );
}
