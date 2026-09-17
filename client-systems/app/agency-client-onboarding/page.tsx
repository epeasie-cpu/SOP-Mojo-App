import type { Metadata } from "next";
import { MarketingPage } from "@/components/MarketingPage";
import { getEntry } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const entry = getEntry("/agency-client-onboarding");

export const metadata: Metadata = buildMetadata(entry);

export default function AgencyClientOnboardingPage() {
  return <MarketingPage entry={entry} />;
}
