import { productPath } from "./links";
import { absoluteUrl } from "./site";

export type SeoSource = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  billing: "once" | "month";
  annualPriceCents: number | null;
  imageUrl: string;
};

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function pricePhrase(source: SeoSource): string {
  if (!source.priceCents) return "";
  const price = formatPrice(source.priceCents);
  if (source.billing === "month") {
    return source.annualPriceCents
      ? `${price}/month, or ${formatPrice(source.annualPriceCents)}/year`
      : `${price}/month`;
  }
  return `${price} one-time`;
}

/** Public product page only. Checkout does not use this. */
export function publicProductUrl(id: string): string {
  const slug = id.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{1,64}$/.test(slug)) return absoluteUrl("/p");
  return absoluteUrl(productPath(slug));
}

export function derivedSeoTitle(source: SeoSource): string {
  const name = source.title.trim();
  if (!name) return "";
  const price = pricePhrase(source);
  return price ? `${name} — ${price} | SOP Mojo` : `${name} | SOP Mojo`;
}

export function derivedSeoDescription(source: SeoSource): string {
  const description = source.description.trim();
  const price = pricePhrase(source);
  if (description && price) return `${description} ${price}.`;
  if (description) return description;
  return price ? `${price}.` : "";
}

function jsonLdImage(imageUrl: string): string | undefined {
  const value = imageUrl.trim();
  if (!value || value.startsWith("data:")) return undefined;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  if (value.startsWith("/")) return absoluteUrl(value);
  return undefined;
}

export function derivedJsonLd(source: SeoSource, pageUrl = publicProductUrl(source.id)): string {
  const image = jsonLdImage(source.imageUrl);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: source.title.trim() || "SOP Mojo",
    description: source.description.trim() || derivedSeoDescription(source),
    ...(image ? { image } : {}),
    brand: { "@type": "Brand", name: "SOP Mojo" },
    offers: {
      "@type": "Offer",
      price: ((source.priceCents || 0) / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: pageUrl,
    },
  });
}

export function prettyJsonLd(source: SeoSource, pageUrl = publicProductUrl(source.id)): string {
  return JSON.stringify(JSON.parse(derivedJsonLd(source, pageUrl)), null, 2);
}

/** Keep a hand-edited SEO title or description. An empty field follows the product again. */
export function followSeoCopy(input: {
  previous: SeoSource;
  next: SeoSource;
  seoTitle: string;
  seoDescription: string;
}): { seoTitle: string; seoDescription: string } {
  const titleFollows = input.seoTitle.trim() === "" || input.seoTitle === derivedSeoTitle(input.previous);
  const descriptionFollows =
    input.seoDescription.trim() === "" || input.seoDescription === derivedSeoDescription(input.previous);
  return {
    seoTitle: titleFollows ? derivedSeoTitle(input.next) : input.seoTitle,
    seoDescription: descriptionFollows ? derivedSeoDescription(input.next) : input.seoDescription,
  };
}

export function resolvedSeo(source: SeoSource, stored?: { title?: string; description?: string }): {
  title: string;
  description: string;
  jsonLd: string;
} {
  return {
    title: stored?.title?.trim() || derivedSeoTitle(source),
    description: stored?.description?.trim() || derivedSeoDescription(source),
    jsonLd: derivedJsonLd(source),
  };
}
