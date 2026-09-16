import type { ReactNode } from "react";
import { jsonLdGraph } from "@/lib/jsonld";
import type { ContentEntry } from "@/lib/content";

export function JsonLd({ entry }: { entry: ContentEntry }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph(entry)) }}
    />
  );
}

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
