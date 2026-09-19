import { jsonLdGraph } from "@/lib/jsonld";

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph()) }}
    />
  );
}
