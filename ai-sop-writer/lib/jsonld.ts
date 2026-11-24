import type { ContentEntry, FaqItem, HowToStep } from "./content";
import { breadcrumbsFor, getTemplateEntries } from "./content";
import { SITE, absoluteUrl } from "./site";

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
    sameAs: [SITE.host, SITE.builder, SITE.library],
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
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: { "@id": `${SITE.parent}#organization` },
  };
}

function crumbName(entry: ContentEntry, crumb: ContentEntry): string {
  const templateTrail = entry.type === "template" || entry.path === "/sop-templates";
  if (crumb.path === "/") return templateTrail ? "Home" : SITE.name;
  return crumb.heading;
}

export function breadcrumbLd(entry: ContentEntry): JsonLd {
  const crumbs = breadcrumbsFor(entry.path);
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumbName(entry, crumb),
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function collectionLd(entry: ContentEntry, items: ContentEntry[]): JsonLd {
  return {
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(entry.path)}#collection`,
    name: entry.heading,
    description: entry.description,
    url: absoluteUrl(entry.path),
    isPartOf: { "@id": `${SITE.host}#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.keyword,
        url: absoluteUrl(item.path),
      })),
    },
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
  const graph: JsonLd[] = [
    organizationLd(),
    websiteLd(),
    softwareApplicationLd(),
  ];
  if (entry.path !== "/") {
    graph.push(breadcrumbLd(entry));
  }
  if (entry.faqs?.length) {
    graph.push(faqLd(entry.faqs));
  }
  if (entry.howTo) {
    graph.push(howToLd(entry.howTo));
  } else if (entry.templateSteps?.length) {
    graph.push(
      howToLd({
        name: entry.heading,
        description: entry.lede ?? entry.description,
        steps: entry.templateSteps.map((step) => ({
          name: step.step,
          text: step.standard ? `${step.owner}. ${step.standard}` : step.owner,
        })),
      }),
    );
  }
  if (entry.path === "/sop-templates") {
    graph.push(collectionLd(entry, getTemplateEntries()));
  }
  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
