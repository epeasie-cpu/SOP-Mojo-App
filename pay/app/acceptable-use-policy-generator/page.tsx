import { AupLanding } from "@/components/AupLanding";
import { freeAupErrorMessage } from "@/lib/aup-free";
import { AUP_CANONICAL_PATH, aupLandingMetadata } from "@/lib/aup-landing";

export const dynamic = "force-dynamic";

export const metadata = aupLandingMetadata();

export default async function AcceptableUsePolicyGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return <AupLanding error={freeAupErrorMessage(query.error)} returnPath={AUP_CANONICAL_PATH} />;
}
