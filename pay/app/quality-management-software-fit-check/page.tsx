import { QmsLanding } from "@/components/QmsLanding";
import { qmsErrorMessage, qmsLandingMetadata } from "@/lib/qms-page";

export const dynamic = "force-dynamic";

export const metadata = qmsLandingMetadata();

export default async function QualitySystemFitCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return <QmsLanding error={qmsErrorMessage(query.error)} />;
}
