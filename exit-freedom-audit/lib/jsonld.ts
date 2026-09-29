import { absolutePageUrl, FAQS, type SeoPage } from "./content";
import { SITE } from "./site";

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
    sameAs: [SITE.host, SITE.writer, SITE.studio, SITE.builder],
  };
}

export function webApplicationLd(): JsonLd {
  return {
    "@type": "WebApplication",
    "@id": `${SITE.host}#app`,
    name: SITE.name,
    alternateName: [SITE.product, "Exit Freedom Readiness"],
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE.host,
    description:
      "Free ops and exit readiness score for SMB CEOs and COOs. A three-minute business operations audit from SOP Mojo. Sellability is a directional band, not a valuation.",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    provider: { "@id": `${SITE.parent}#organization` },
    audience: {
      "@type": "BusinessAudience",
      audienceType: "SMB CEOs and COOs",
    },
  };
}

export function faqLd(): JsonLd {
  return {
    "@type": "FAQPage",
    "@id": `${SITE.host}/faq#faq`,
    url: `${SITE.host}/faq`,
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function webPageLd(page: SeoPage): JsonLd {
  return {
    "@type": "WebPage",
    "@id": `${absolutePageUrl(page.path)}#webpage`,
    url: absolutePageUrl(page.path),
    name: page.heading,
    description: page.description,
    isPartOf: { "@id": `${SITE.host}#app` },
    about: { "@id": `${SITE.parent}#organization` },
  };
}

export function jsonLdGraph(page: SeoPage): JsonLd {
  const graph = [organizationLd(), webApplicationLd(), webPageLd(page)];
  if (page.path === "/faq") graph.push(faqLd());
  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
