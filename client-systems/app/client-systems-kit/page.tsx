import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/client-systems-kit");

export const metadata: Metadata = buildMetadata(entry);

export default function ClientSystemsKitPage() {
  return <MarketingPage entry={entry} />;
}
