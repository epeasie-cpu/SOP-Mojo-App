import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/client-proposal-template");

export const metadata: Metadata = buildMetadata(entry);

export default function ClientProposalTemplatePage() {
  return <MarketingPage entry={entry} />;
}
