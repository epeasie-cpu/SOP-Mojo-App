import { AupLanding } from "@/components/AupLanding";
import { freeAupErrorMessage, FREE_AUP_PATH } from "@/lib/aup-free";
import { aupLandingMetadata } from "@/lib/aup-landing";

export const dynamic = "force-dynamic";

export const metadata = aupLandingMetadata();

export default async function FreeAupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return <AupLanding error={freeAupErrorMessage(query.error)} returnPath={FREE_AUP_PATH} />;
}
