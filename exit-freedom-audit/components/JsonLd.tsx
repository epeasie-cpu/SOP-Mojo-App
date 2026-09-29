import { jsonLdGraph } from "@/lib/jsonld";
import type { SeoPage } from "@/lib/content";

export function JsonLd({ page }: { page: SeoPage }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph(page)) }}
    />
  );
}
