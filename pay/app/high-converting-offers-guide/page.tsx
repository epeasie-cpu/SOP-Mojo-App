import { OffersLanding } from "@/components/OffersLanding";
import { deliverableExists } from "@/lib/deliverables";
import { OFFERS_STORAGE_PATH } from "@/lib/library";
import { offersLandingMetadata } from "@/lib/offers-page";

export const dynamic = "force-dynamic";

export const metadata = offersLandingMetadata();

export default async function HighConvertingOffersGuidePage() {
  const available = await deliverableExists({ storagePath: OFFERS_STORAGE_PATH });
  return <OffersLanding available={available} />;
}
