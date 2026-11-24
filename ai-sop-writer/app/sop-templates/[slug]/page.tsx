import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplatePage } from "@/components/TemplatePage";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return TEMPLATES.map((entry) => ({ slug: entry.slug as string }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getTemplate(slug);
  if (!entry) return {};
  return buildMetadata(entry);
}

export default async function SopTemplatePage({ params }: Props) {
  const { slug } = await params;
  const entry = getTemplate(slug);
  if (!entry) notFound();
  return <TemplatePage entry={entry} />;
}
