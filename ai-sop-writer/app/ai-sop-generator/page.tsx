import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/ai-sop-generator");

export const metadata: Metadata = buildMetadata(entry);

export default function AiSopGeneratorPage() {
  return <MarketingPage entry={entry} showGenerator />;
}
