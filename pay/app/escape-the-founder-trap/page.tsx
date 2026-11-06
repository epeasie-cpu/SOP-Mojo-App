import { FounderTrapLanding } from "@/components/FounderTrapLanding";
import { deliverableExists } from "@/lib/deliverables";
import { founderTrapErrorMessage } from "@/lib/founder-trap";
import { founderTrapLandingMetadata } from "@/lib/founder-trap-page";
import { FOUNDER_TRAP_STORAGE_PATH } from "@/lib/library";

export const dynamic = "force-dynamic";

export const metadata = founderTrapLandingMetadata();

export default async function EscapeTheFounderTrapPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const available = await deliverableExists({ storagePath: FOUNDER_TRAP_STORAGE_PATH });
  return <FounderTrapLanding available={available} error={founderTrapErrorMessage(query.error)} />;
}
