import { CptKitLanding } from "@/components/CptKitLanding";
import { cptKitErrorMessage, cptKitLandingMetadata } from "@/lib/cpt-kit-page";

export const dynamic = "force-dynamic";

export const metadata = cptKitLandingMetadata();

export default async function CptKitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return <CptKitLanding error={cptKitErrorMessage(query.error)} />;
}
