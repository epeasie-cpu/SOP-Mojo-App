import { absoluteUrl } from "./site";
import type { Product } from "./catalog";

export function productJson(product: Product, pageUrl: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.seo.description || product.description,
    brand: { "@type": "Brand", name: "SOP Mojo" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: (product.priceCents / 100).toFixed(2),
      url: pageUrl,
      availability: "https://schema.org/InStock",
    },
  };
}

function jsonLd(name: string, description: string, price: string, path: string, imagePath: string): string {
  const pageUrl = absoluteUrl(path);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: absoluteUrl(imagePath),
    brand: { "@type": "Brand", name: "SOP Mojo" },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: pageUrl,
    },
  });
}

export function seedProducts(): Product[] {
  return [
    {
      id: "flowchart_plus",
      title: "Flowchart Plus",
      description: "One-time unlock. Print and PNG/JSON export in Flowchart Studio.",
      priceCents: 1900,
      currency: "usd",
      imageUrl: "/products/flowchart.svg",
      billing: "once",
      annual: null,
      orderBump: null,
      presentation: "page",
      entitlementProduct: "flowchart_plus",
      seo: {
        title: "Flowchart Plus — $19 one-time unlock | SOP Mojo",
        description:
          "Unlock print and PNG/JSON export in Flowchart Studio. One-time $19. Does not include Builder Pro.",
        jsonLd: jsonLd(
          "Flowchart Plus",
          "One-time unlock for print and PNG/JSON export in Flowchart Studio.",
          "19.00",
          "/p/flowchart_plus",
          "/products/flowchart.svg",
        ),
      },
      active: true,
    },
    {
      id: "builder_pro",
      title: "Builder Pro",
      description: "SOP Builder Pro. Print, export, and send flowcharts to Builder.",
      priceCents: 3900,
      currency: "usd",
      imageUrl: "/products/builder.svg",
      billing: "month",
      annual: {
        priceCents: 39000,
        label: "Pay annually — $390/year (2 months free)",
      },
      orderBump: null,
      presentation: "panel",
      entitlementProduct: "builder_pro",
      seo: {
        title: "Builder Pro — $39/month | SOP Mojo",
        description:
          "Builder Pro is $39 a month, or $390 a year (2 months free). Includes print, export, and Export to Builder.",
        jsonLd: jsonLd(
          "Builder Pro",
          "SOP Builder Pro subscription. $39 a month or $390 a year.",
          "39.00",
          "/p/builder_pro",
          "/products/builder.svg",
        ),
      },
      active: true,
    },
  ];
}

export function seedCatalog() {
  return {
    products: seedProducts(),
    settings: { stripeMode: "test" as const, taxNotice: null },
  };
}
