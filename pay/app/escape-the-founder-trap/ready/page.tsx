import { FounderTrapReady } from "@/components/FounderTrapReady";
import { founderTrapDownloadToken } from "@/lib/founder-trap";
import { privateMetadata } from "@/lib/seo";

export const metadata = privateMetadata("Your Escape the Founder Trap download | SOP Mojo");

export default async function FounderTrapReadyPage({
  searchParams,
}: {
  searchParams: Promise<{ download?: string }>;
}) {
  const query = await searchParams;
  return <FounderTrapReady token={founderTrapDownloadToken(query.download)} />;
}
