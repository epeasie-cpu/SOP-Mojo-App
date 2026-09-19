import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

export type PageSeo = {
  path: string;
  keyword: string;
  description: string;
  index?: boolean;
};

export function pageTitle(keyword: string): string {
  return `${keyword} | ${SITE.name} | ${SITE.parentName}`;
}

export function buildMetadata(page: PageSeo): Metadata {
  const title = pageTitle(page.keyword);
  const url = absoluteUrl(page.path);
  const index = page.index !== false;
  return {
    title,
    description: page.description,
    keywords: [
      page.keyword,
      "handwriting to flowchart",
      "AI process map",
      "AI flowchart",
      "handwritten process map",
      "SOP flowchart",
      "Flowchart Studio",
      "SOP Mojo",
    ],
    authors: [{ name: SITE.founderName, url: SITE.parent }],
    creator: SITE.parentName,
    publisher: SITE.parentName,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: "website",
      url,
      title,
      description: page.description,
      siteName: SITE.name,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.description,
    },
  };
}
