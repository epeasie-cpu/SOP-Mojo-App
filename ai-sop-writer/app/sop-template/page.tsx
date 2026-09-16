import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/sop-template");

export const metadata: Metadata = buildMetadata(entry);

export default function SopTemplatePage() {
  return <MarketingPage entry={entry} showGenerator />;
}
