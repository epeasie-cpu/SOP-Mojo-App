import type { Metadata } from "next";
import { INDEX_ROBOTS } from "./robots";
import { SITE, absoluteUrl } from "./site";

export const BLUEPRINT_PATH = "/business-os-blueprint";

export const BLUEPRINT_SEO_TITLE =
  "The Business OS Blueprint: Build SOPs & Systems That Scale ($1M to $10M) | SOP Mojo";

export const BLUEPRINT_SEO_DESCRIPTION =
  "A $27 playbook on how to build SOPs and a business operating system that scales from $1M to $10M without founder dependency.";

export const BLUEPRINT_H1 = "The Business OS Blueprint";

export const BLUEPRINT_FULL_TITLE =
  "The Business Operating System: How to Build SOPs & Systems That Scale You from $1M to $10M";

export const BLUEPRINT_PROMISE =
  "Build the SOPs and systems that scale a founder-run company from $1M to $10M.";

export const BLUEPRINT_PRICE_LABEL = "$27";

/** Display price from the current SOP Mojo sales page. The catalog charge stays $27. */
export const BLUEPRINT_COMPARE_AT = "$79.99";

export const BLUEPRINT_BUY_LABEL = "Buy the Blueprint — $27";

export const BLUEPRINT_GO = "https://pay.sopmojo.com/go/business_os_blueprint";

export const BLUEPRINT_SUPPORT = "Questions? Email support";

export const BLUEPRINT_GERBER =
  "If your business depends on you, you don't own a business—you have a job.";

export const BLUEPRINT_OG_IMAGE_PATH = `${BLUEPRINT_PATH}/opengraph-image`;

export const BLUEPRINT_PARTS: { title: string; detail: string }[] = [
  {
    title: "Intro",
    detail: "Why $1M businesses stall, the hidden ceiling, and the warning signs.",
  },
  {
    title: "Part 1",
    detail: "Breaking the Founder Trap.",
  },
  {
    title: "Part 2",
    detail: "The 4-System Framework (Get Work, Do Work, Run, Guide), with diagnostic questions.",
  },
  {
    title: "Part 3",
    detail:
      "Building your Business OS: role mapping, process mapping, crafting SOPs beyond templates, and a knowledge hub as the single source of truth.",
  },
  {
    title: "Part 4",
    detail: "Operational milestones at $1M, $3M, $5M, and $10M, plus scaling mindset shifts.",
  },
  {
    title: "Part 5",
    detail:
      "Turning systems into sellable value: why systemized businesses get higher offers, SOPs as transferable assets, and the Walk Away Test.",
  },
  {
    title: "Close",
    detail: "SOP Mojo frameworks, next steps, and a conclusion.",
  },
];

export const BLUEPRINT_SYSTEMS: { name: string; question: string }[] = [
  { name: "Get Work", question: "Where does the next customer come from if you stop selling?" },
  { name: "Do Work", question: "Can someone else deliver the result without asking you?" },
  { name: "Run", question: "Do the numbers tell you what to fix this week?" },
  { name: "Guide", question: "Who decides, and where does the current way of working live?" },
];

export const BLUEPRINT_FOR = [
  "Owners around $1M who are still the person every decision waits on.",
  "Operators who want to know how to build SOPs people can run, not a folder of unused templates.",
  "Founders who want the business to keep working when they step out of a day, a week, or a sale.",
];

export const BLUEPRINT_NOT_FOR = [
  "Someone shopping for a pile of fill-in templates and nothing else.",
  "A team that wants software instead of a playbook. Builder Pro is the separate tool for writing the SOPs.",
  "Anyone looking for legal, tax, or valuation advice. This is an operating playbook.",
];

export const BLUEPRINT_WARNING_SIGNS = [
  "The business slows down when you leave for a day.",
  "Closing, delivery, or a decision still waits on you.",
  "The way work gets done lives in your head, not where the team can find it.",
];

export const BLUEPRINT_ABOUT =
  "Ryan Pease spent 18 years in military operations in civil engineering and logistics. He is a serial entrepreneur and the founder of SOP Mojo.";

export const BLUEPRINT_FAQ: { question: string; answer: string }[] = [
  {
    question: "What is a business operating system?",
    answer:
      "A business operating system is the set of roles, processes, and SOPs that tell the company how work gets done without the founder in the middle of every step. The Business OS Blueprint is a 34-page playbook for building that system.",
  },
  {
    question: "How do you build SOPs that are more than a template?",
    answer:
      "Part 3 walks through role mapping, process mapping, and crafting SOPs from the way the work actually happens. A template is a starting shape. The playbook is about writing the steps your team can run, then keeping them in one knowledge hub.",
  },
  {
    question: "What is the 4 system framework?",
    answer:
      "The 4-System Framework in Part 2 splits the company into Get Work, Do Work, Run, and Guide. Each system has diagnostic questions so you can see which one is stuck before you write a pile of documents.",
  },
  {
    question: "Who is this for?",
    answer:
      "It is for a founder who wants to escape founder dependency and scale a business with systems from about $1M toward $10M. It is not a fit if you want templates only, or if you want legal or valuation advice.",
  },
  {
    question: "What do I get after I pay $27?",
    answer:
      "You get The Business OS Blueprint PDF. The thank-you page has a download button after Stripe marks the payment paid, and we email the same download link. The link works for 30 days and up to 10 downloads.",
  },
  {
    question: "Who do I contact if I have a question?",
    answer: `${BLUEPRINT_SUPPORT} at ${SITE.founderEmail}. Refunds, when Stripe issues one, follow the refund policy. This page does not add a separate refund promise.`,
  },
];

export function blueprintCheckoutHref(available: boolean): string | null {
  return available ? BLUEPRINT_GO : null;
}

export function blueprintCanonicalUrl(): string {
  return absoluteUrl(BLUEPRINT_PATH);
}

export function blueprintProductJsonLd(inStock: boolean): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: BLUEPRINT_H1,
    description: BLUEPRINT_SEO_DESCRIPTION,
    brand: { "@type": "Brand", name: "SOP Mojo" },
    url: blueprintCanonicalUrl(),
    offers: {
      "@type": "Offer",
      price: "27.00",
      priceCurrency: "USD",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: blueprintCanonicalUrl(),
    },
  };
}

export function blueprintFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: BLUEPRINT_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function blueprintLandingMetadata(): Metadata {
  const url = blueprintCanonicalUrl();
  const image = absoluteUrl(BLUEPRINT_OG_IMAGE_PATH);
  return {
    title: BLUEPRINT_SEO_TITLE,
    description: BLUEPRINT_SEO_DESCRIPTION,
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      type: "website",
      url,
      title: BLUEPRINT_SEO_TITLE,
      description: BLUEPRINT_SEO_DESCRIPTION,
      siteName: SITE.name,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: BLUEPRINT_H1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: BLUEPRINT_SEO_TITLE,
      description: BLUEPRINT_SEO_DESCRIPTION,
      images: [image],
    },
  };
}
