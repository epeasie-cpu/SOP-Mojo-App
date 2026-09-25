import { SITE, PRICING, absoluteUrl } from "./site";

type JsonLd = Record<string, unknown>;

export function jsonLdGraph(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
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
        sameAs: [SITE.host, SITE.builder, SITE.library, SITE.writer],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.host}#website`,
        name: SITE.name,
        url: SITE.host,
        description: SITE.tagline,
        publisher: { "@id": `${SITE.parent}#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE.host}#app`,
        name: SITE.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE.host,
        description: SITE.tagline,
        featureList: [
          "Handwriting to flowchart",
          "AI process map from text or voice",
          "Editable React Flow canvas",
          "Chat edits on the same graph",
          "Export and send to SOP Builder Pro",
        ],
        offers: [
          {
            "@type": "Offer",
            name: "Free create and iterate",
            price: "0",
            priceCurrency: "USD",
          },
          {
            "@type": "Offer",
            name: "Builder Pro",
            price: "39",
            priceCurrency: "USD",
            description: PRICING.builderLabel,
          },
          {
            "@type": "Offer",
            name: "Flowchart Plus",
            price: "19",
            priceCurrency: "USD",
            description: PRICING.unlockDetail,
          },
        ],
        author: { "@id": `${SITE.parent}#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${absoluteUrl("/")}#webpage`,
        url: absoluteUrl("/"),
        name: SITE.name,
        description: SITE.tagline,
        isPartOf: { "@id": `${SITE.host}#website` },
      },
    ],
  };
}

export function howToJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Turn handwriting into an AI process map",
    description:
      "Photograph a handwritten scribble, paste a process, or talk it through. Edit the flowchart, then send it to Builder Pro.",
    step: [
      {
        "@type": "HowToStep",
        name: "Capture the process",
        text: "Paste text, use voice, or upload a photo of a handwritten scribble.",
      },
      {
        "@type": "HowToStep",
        name: "Edit the canvas",
        text: "Drag, rename, and reconnect nodes. Use chat for modular AI edits.",
      },
      {
        "@type": "HowToStep",
        name: "Export with Builder Pro",
        text: "Print, export, or send the mapped steps to SOP Builder Pro.",
      },
    ],
  };
}
