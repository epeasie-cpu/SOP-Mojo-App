import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/client-onboarding-checklist");

export const metadata: Metadata = buildMetadata(entry);

export default function ClientOnboardingChecklistPage() {
  return <MarketingPage entry={entry} />;
}
