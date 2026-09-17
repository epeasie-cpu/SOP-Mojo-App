import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/sales-to-delivery-handoff");

export const metadata: Metadata = buildMetadata(entry);

export default function SalesToDeliveryHandoffPage() {
  return <MarketingPage entry={entry} />;
}
