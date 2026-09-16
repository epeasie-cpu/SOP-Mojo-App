import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/how-to-write-an-sop");

export const metadata: Metadata = buildMetadata(entry);

export default function HowToWriteAnSopPage() {
  return <MarketingPage entry={entry} />;
}
