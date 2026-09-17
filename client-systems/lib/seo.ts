import type { Metadata } from "next";
import type { ContentEntry } from "./content";
import { SITE, absoluteUrl } from "./site";

export function pageTitle(keyword: string): string {
  return `${keyword} | ${SITE.name} | ${SITE.parentName}`;
}

export function buildMetadata(entry: ContentEntry): Metadata {
  const title = pageTitle(entry.keyword);
  const url = absoluteUrl(entry.path);
  return {
    title,
    description: entry.description,
    keywords: [
      entry.keyword,
      SITE.name,
      SITE.parentName,
      "client onboarding",
      "client onboarding systems",
    ],
    authors: [{ name: SITE.founderName, url: SITE.parent }],
    creator: SITE.parentName,
    publisher: SITE.parentName,
    alternates: { canonical: url },
    robots: entry.index
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: "website",
      url,
      title,
      description: entry.description,
      siteName: SITE.name,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: entry.description,
    },
  };
}

export function marketingMetadata(input: {
  keyword: string;
  description: string;
  path?: string;
  index?: boolean;
}): Metadata {
  const title = pageTitle(input.keyword);
  const url = absoluteUrl(input.path ?? "/");
  const index = input.index ?? true;
  return {
    title,
    description: input.description,
    keywords: [input.keyword, SITE.name, SITE.parentName, "client onboarding"],
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
      description: input.description,
      siteName: SITE.name,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
    },
  };
}

export const noIndexMetadata: Pick<Metadata, "robots"> = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
