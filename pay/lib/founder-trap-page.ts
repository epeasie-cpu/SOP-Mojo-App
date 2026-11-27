import type { Metadata } from "next";
import { INDEX_ROBOTS } from "./robots";
import { SITE, absoluteUrl } from "./site";

export const FOUNDER_TRAP_PATH = "/escape-the-founder-trap";

export const FOUNDER_TRAP_ALIAS_PATH = "/free/founder-trap";

export const FOUNDER_TRAP_SEO_TITLE =
  "Escape the Founder Trap: Free Guide to Stop Being Your Business's Bottleneck | SOP Mojo";

export const FOUNDER_TRAP_SEO_DESCRIPTION =
  "Escape the founder trap. A free guide to founder dependency, an owner dependent business, and how to stop being the bottleneck in your business.";

export const FOUNDER_TRAP_H1 = "Escape the founder trap";

export const FOUNDER_TRAP_PRICE_LABEL = "Free";

export const FOUNDER_TRAP_PROMISE =
  "A free 15-page guide to founder dependency: how to stop being the bottleneck in your business when the work still runs through you.";

export const FOUNDER_TRAP_SUPPORT = "Questions? Email support";

export const FOUNDER_TRAP_OG_IMAGE_PATH = `${FOUNDER_TRAP_PATH}/opengraph-image`;

export const FOUNDER_TRAP_SECTIONS: { title: string; detail: string }[] = [
  {
    title: "Are you the bottleneck?",
    detail:
      "The opening section names four warning signs that the founder is the bottleneck. It asks you to read those signs against your own week. It does not score the business or promise a result.",
  },
  {
    title: "Amateur operator vs asset-driven enterprise",
    detail:
      "An amateur operator keeps the work in tribal knowledge. An asset-driven enterprise systemizes it so the business can run when the founder is not in the room.",
  },
  {
    title: "What an SOP really is",
    detail: "The guide explains what an SOP really is, and how a policy, a process, and an SOP are different.",
  },
  {
    title: "Three pathologies",
    detail:
      "Single point of failure, the telephone game, and the innovation chokehold. These are the ways an owner dependent business keeps the founder in the middle of the work.",
  },
  {
    title: "The hidden taxes",
    detail: "Onboarding, error, and key-person risk. The guide names the costs. It does not invent a dollar figure for them.",
  },
];

export const FOUNDER_TRAP_FOR = [
  "A founder who suspects they are the bottleneck.",
  "An owner of an owner dependent business.",
  "A reader who wants the difference between tribal knowledge and systemization, before the full blueprint.",
];

export const FOUNDER_TRAP_NOT_FOR = [
  "Someone looking for a promised revenue number. This guide does not give one.",
  "A reader who wants a finished SOP template. This is the diagnosis. The Business OS Blueprint is the full playbook.",
];

export const FOUNDER_TRAP_FAQ: { question: string; answer: string }[] = [
  {
    question: "What is the founder trap?",
    answer:
      "The founder trap is the pattern where the business only moves when the founder does. The guide treats that as a bottleneck, not as a compliment.",
  },
  {
    question: "What is founder dependency?",
    answer:
      "Founder dependency means the work, the decisions, or the customer relationship still sit with one person. An owner dependent business has the same problem under another name.",
  },
  {
    question: "How do you stop being the bottleneck in your business?",
    answer:
      "The guide starts by naming the warning signs, then the difference between tribal knowledge and a system. The next step after this free guide is the Business OS Blueprint, which is the full playbook.",
  },
  {
    question: "What is an owner dependent business?",
    answer:
      "An owner dependent business stalls when the owner is out. The guide contrasts that with an asset-driven enterprise that has written the work down.",
  },
  {
    question: "What is in the free guide?",
    answer:
      "A 15-page PDF from SOP Mojo. It covers four warning signs, amateur operator versus asset-driven enterprise, what an SOP really is, three pathologies, and the hidden taxes of onboarding, error, and key-person risk.",
  },
  {
    question: "What happens after I enter my email?",
    answer: `${FOUNDER_TRAP_SUPPORT} at ${SITE.founderEmail} if the link does not arrive. When the file is ready, the thank-you page has a download button and we email the same link. The link works for 30 days and up to 10 downloads. This page is free and does not add a refund promise.`,
  },
];

export function founderTrapCanonicalUrl(): string {
  return absoluteUrl(FOUNDER_TRAP_PATH);
}

export function founderTrapProductJsonLd(inStock: boolean): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Escape the Founder Trap",
    description: FOUNDER_TRAP_SEO_DESCRIPTION,
    brand: { "@type": "Brand", name: "SOP Mojo" },
    url: founderTrapCanonicalUrl(),
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "USD",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: founderTrapCanonicalUrl(),
    },
  };
}

export function founderTrapFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FOUNDER_TRAP_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function founderTrapLandingMetadata(): Metadata {
  const url = founderTrapCanonicalUrl();
  const image = absoluteUrl(FOUNDER_TRAP_OG_IMAGE_PATH);
  return {
    title: FOUNDER_TRAP_SEO_TITLE,
    description: FOUNDER_TRAP_SEO_DESCRIPTION,
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      type: "website",
      url,
      title: FOUNDER_TRAP_SEO_TITLE,
      description: FOUNDER_TRAP_SEO_DESCRIPTION,
      siteName: SITE.name,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: FOUNDER_TRAP_H1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: FOUNDER_TRAP_SEO_TITLE,
      description: FOUNDER_TRAP_SEO_DESCRIPTION,
      images: [image],
    },
  };
}
