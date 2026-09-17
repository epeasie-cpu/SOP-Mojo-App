import type { ContentEntry, FaqItem, HowToStep } from "./content";
import { breadcrumbsFor } from "./content";
import {
  KIT_PRICE_USD,
  SITE,
  absoluteUrl,
  kitCheckoutIsLive,
  kitCheckoutUrl,
} from "./site";

type JsonLd = Record<string, unknown>;

export function organizationLd(): JsonLd {
  return {
    "@type": "Organization",
    "@id": `${SITE.parent}#organization`,
    name: SITE.parentName,
    url: SITE.parent,
    email: SITE.founderEmail,
    founder: {
      "@type": "Person",
      name: SITE.founderName,
      email: SITE.founderEmail,
    },
    sameAs: [SITE.host, SITE.writer, SITE.builder, SITE.library],
  };
}

export function websiteLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": `${SITE.host}#website`,
    name: SITE.name,
    url: SITE.host,
    description: SITE.tagline,
    publisher: { "@id": `${SITE.parent}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.host}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationLd(): JsonLd {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE.host}#app`,
    name: SITE.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE.host,
    description: SITE.tagline,
    author: { "@id": `${SITE.parent}#organization` },
  };
}

export function productOfferLd(): JsonLd | null {
  if (!kitCheckoutIsLive()) return null;
  return {
    "@type": "Product",
    name: "Client Systems Kit",
    description:
      "SOP Mojo Client Systems Kit — $39 blueprint for client onboarding systems. Run it in the Client Systems workspace after yes.",
    brand: { "@id": `${SITE.parent}#organization` },
    url: absoluteUrl("/client-systems-kit"),
    offers: {
      "@type": "Offer",
      price: KIT_PRICE_USD,
      priceCurrency: "USD",
      url: kitCheckoutUrl(),
      availability: "https://schema.org/InStock",
    },
  };
}

export function breadcrumbLd(entry: ContentEntry): JsonLd {
  const crumbs = breadcrumbsFor(entry.path);
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.path === "/" ? SITE.name : crumb.heading,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqLd(faqs: FaqItem[]): JsonLd {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function howToLd(howTo: {
  name: string;
  description: string;
  steps: HowToStep[];
}): JsonLd {
  return {
    "@type": "HowTo",
    name: howTo.name,
    description: howTo.description,
    step: howTo.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function jsonLdGraph(entry: ContentEntry): JsonLd {
  const graph: JsonLd[] = [];
  if (entry.path === "/") {
    graph.push(organizationLd(), websiteLd(), softwareApplicationLd());
  }
  graph.push(breadcrumbLd(entry));
  if (entry.path === "/client-onboarding-checklist") {
    if (entry.faqs?.length) graph.push(faqLd(entry.faqs));
    if (entry.howTo) graph.push(howToLd(entry.howTo));
  }
  if (entry.path === "/faq" && entry.faqs?.length) {
    graph.push(faqLd(entry.faqs));
  }
  if (entry.path === "/client-systems-kit") {
    const product = productOfferLd();
    if (product) graph.push(product);
  }
  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
