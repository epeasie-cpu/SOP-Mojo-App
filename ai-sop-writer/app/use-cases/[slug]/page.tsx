import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingPage } from "@/components/MarketingPage";
import { findEntry, getUseCaseEntries } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

type Props = PageProps<"/use-cases/[slug]">;

export function generateStaticParams() {
  return getUseCaseEntries().map((entry) => ({ slug: entry.slug as string }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = findEntry(`/use-cases/${slug}`);
  if (!entry) return {};
  return buildMetadata(entry);
}

export default async function UseCasePage({ params }: Props) {
  const { slug } = await params;
  const entry = findEntry(`/use-cases/${slug}`);
  if (!entry) notFound();
  return <MarketingPage entry={entry} showGenerator />;
}
