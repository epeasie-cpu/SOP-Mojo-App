import type { Metadata } from "next";
import { absolutePageUrl, type SeoPage } from "./content";
import { SITE } from "./site";

export function documentTitle(page: SeoPage): string {
  return `${page.title} | ${SITE.parentName}`;
}

export function buildMetadata(page: SeoPage): Metadata {
  const title = documentTitle(page);
  const url = absolutePageUrl(page.path);
  return {
    title: { absolute: title },
    description: page.description,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description: page.description,
      siteName: SITE.parentName,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.description,
    },
  };
}
