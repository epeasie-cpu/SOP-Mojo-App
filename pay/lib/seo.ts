import type { Metadata } from "next";
import { INDEX_ROBOTS, NOINDEX_ROBOTS } from "./robots";
import { SITE, absoluteUrl } from "./site";

export function productMetadata(input: {
  path: string;
  title: string;
  description: string;
}): Metadata {
  const title = input.title.trim() || `SOP Mojo`;
  const url = absoluteUrl(input.path);
  return {
    title,
    description: input.description,
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      type: "website",
      url,
      title,
      description: input.description,
      siteName: SITE.name,
      locale: "en_US",
    },
    twitter: { card: "summary", title, description: input.description },
  };
}

export function checkoutMetadata(title: string): Metadata {
  return {
    title,
    robots: NOINDEX_ROBOTS,
  };
}

export function privateMetadata(title: string): Metadata {
  return { title, robots: NOINDEX_ROBOTS };
}
