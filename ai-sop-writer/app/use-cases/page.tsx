import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/use-cases");

export const metadata: Metadata = buildMetadata(entry);

export default function UseCasesIndexPage() {
  return <MarketingPage entry={entry} />;
}
