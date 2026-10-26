import { QcPackLanding } from "@/components/QcPackLanding";
import { qcPackErrorMessage, qcPackLandingMetadata } from "@/lib/qc-pack-page";

export const dynamic = "force-dynamic";

export const metadata = qcPackLandingMetadata();

export default async function QualityControlStarterPackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return <QcPackLanding error={qcPackErrorMessage(query.error)} />;
}
