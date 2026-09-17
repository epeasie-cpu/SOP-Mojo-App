import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/pricing");

export const metadata: Metadata = buildMetadata(entry);

export default function PricingPage() {
  return <MarketingPage entry={entry} />;
}
