import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/vs/sop-builder-pro");

export const metadata: Metadata = buildMetadata(entry);

export default function VsSopBuilderProPage() {
  return <MarketingPage entry={entry} />;
}
