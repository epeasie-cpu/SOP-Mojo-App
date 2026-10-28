import { BlueprintLanding } from "@/components/BlueprintLanding";
import { blueprintLandingMetadata } from "@/lib/blueprint-page";
import { deliverableExists } from "@/lib/deliverables";
import { BLUEPRINT_STORAGE_PATH } from "@/lib/library";

export const dynamic = "force-dynamic";

export const metadata = blueprintLandingMetadata();

export default async function BusinessOsBlueprintPage() {
  const available = await deliverableExists({ storagePath: BLUEPRINT_STORAGE_PATH });
  return <BlueprintLanding available={available} />;
}
