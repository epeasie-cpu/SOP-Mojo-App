import type { Metadata } from "next";
import { INDEX_ROBOTS } from "./robots";
import { SITE, absoluteUrl } from "./site";

export const OFFERS_PATH = "/high-converting-offers-guide";

export const OFFERS_SEO_TITLE = "How to Create High-Converting Offers: The 2026 Guide | SOP Mojo";

export const OFFERS_SEO_DESCRIPTION =
  "How to create an irresistible offer. A $19.99 guide to a high converting offer framework, bonus stacking, and funnel placement.";

export const OFFERS_H1 = "How to create high-converting offers";

export const OFFERS_FULL_TITLE = "The Ultimate Guide to Creating High-Converting Offers That Sell";

export const OFFERS_EDITION = "2026 Edition";

export const OFFERS_PROMISE =
  "A step-by-step offer framework: a clear value proposition, bonus stacking, and a place in the funnel.";

export const OFFERS_PRICE_LABEL = "$19.99";

/** Display price from the current SOP Mojo sales page. The catalog charge is $19.99. */
export const OFFERS_COMPARE_AT = "$67.99";

export const OFFERS_BUY_LABEL = "Buy the guide — $19.99";

export const OFFERS_GO = "https://pay.sopmojo.com/go/offers_guide";

export const OFFERS_SUPPORT = "Questions? Email support";

export const OFFERS_OG_IMAGE_PATH = `${OFFERS_PATH}/opengraph-image`;

export const OFFERS_PARTS: { title: string; detail: string }[] = [
  {
    title: "Intro",
    detail:
      "What makes an offer high-converting, what an offer is not versus what it is, and the Four Pillars: a clear value proposition, psychological triggers, irresistible bonuses, and strategic funnel placement.",
  },
  {
    title: "Chapter 1",
    detail: "Psychology: desire, trust and timing, and three core motivators — transformation, FOMO, and trust.",
  },
  {
    title: "Chapter 2",
    detail: "A step-by-step offer framework you can follow when you build the next offer.",
  },
  {
    title: "Chapter 3",
    detail: "Real-world case studies of offers. The chapter shows examples. It does not promise the same result for your business.",
  },
  {
    title: "Chapter 4",
    detail: "Common mistakes: pricing pitfalls, unclear calls to action, and overcomplicated offers.",
  },
  {
    title: "Chapter 5",
    detail: "Conclusion and next steps.",
  },
];

export const OFFERS_PILLARS: { name: string; detail: string }[] = [
  { name: "Clear value proposition", detail: "The buyer can say what they get, and why it is worth the price." },
  { name: "Psychological triggers", detail: "Desire, trust, and timing, including transformation and FOMO." },
  { name: "Irresistible bonuses", detail: "Bonus stacking that supports the main promise instead of burying it." },
  { name: "Strategic funnel placement", detail: "Where the offer sits, and what the reader is asked to do next." },
];

export const OFFERS_FOR = [
  "Digital marketers who write the offer the page is selling.",
  "Business owners who want a high converting offer their team can explain.",
  "Funnel builders deciding where the offer sits.",
  "Email marketers who need a clear next step in the message.",
];

export const OFFERS_NOT_FOR = [
  "Someone who wants a swipe file and no decisions.",
  "A reader looking for a promised revenue number. This guide does not give one.",
  "Anyone looking for legal, tax, or financial advice.",
];

export const OFFERS_NOT_IS: { label: string; detail: string }[] = [
  { label: "An offer is not", detail: "A discount, a feature list, or a stack of bonuses with no promise." },
  { label: "An offer is", detail: "A clear exchange: what the buyer gets, why it matters now, and what they do next." },
];

export const OFFERS_ABOUT =
  "Ryan Pease spent 18 years in military operations in civil engineering and logistics. He is a serial entrepreneur and the founder of SOP Mojo. He wrote this 2026 edition.";

export const OFFERS_FAQ: { question: string; answer: string }[] = [
  {
    question: "What is a high converting offer?",
    answer:
      "A high converting offer is a clear exchange: the value proposition, the reason to act, the bonuses, and the next step. A lower price by itself is not an offer.",
  },
  {
    question: "How do you create an irresistible offer?",
    answer:
      "Chapter 2 is a step-by-step offer framework. You name the result, the buyer, the proof you actually have, the bonuses, and the call to action. Then you cut anything that makes the offer harder to understand.",
  },
  {
    question: "What is the offer framework in this guide?",
    answer:
      "The intro names four pillars: a clear value proposition, psychological triggers, irresistible bonuses, and strategic funnel placement. Chapter 2 turns those into steps.",
  },
  {
    question: "What is bonus stacking?",
    answer:
      "Bonus stacking is adding extras that make the main promise easier to accept. The guide treats bonuses as part of the offer, not as a pile of unrelated files.",
  },
  {
    question: "What do I get after I pay $19.99?",
    answer:
      "You get the 31-page PDF, The Ultimate Guide to Creating High-Converting Offers That Sell, 2026 Edition. The thank-you page has a download button after Stripe marks the payment paid, and we email the same link. The link works for 30 days and up to 10 downloads.",
  },
  {
    question: "Who do I contact if I have a question?",
    answer: `${OFFERS_SUPPORT} at ${SITE.founderEmail}. Refunds, when Stripe issues one, follow the refund policy. This page does not add a separate refund promise.`,
  },
];

export function offersCheckoutHref(available: boolean): string | null {
  return available ? OFFERS_GO : null;
}

export function offersCanonicalUrl(): string {
  return absoluteUrl(OFFERS_PATH);
}

export function offersProductJsonLd(inStock: boolean): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: OFFERS_FULL_TITLE,
    description: OFFERS_SEO_DESCRIPTION,
    brand: { "@type": "Brand", name: "SOP Mojo" },
    url: offersCanonicalUrl(),
    offers: {
      "@type": "Offer",
      price: "19.99",
      priceCurrency: "USD",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: offersCanonicalUrl(),
    },
  };
}

export function offersFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: OFFERS_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function offersLandingMetadata(): Metadata {
  const url = offersCanonicalUrl();
  const image = absoluteUrl(OFFERS_OG_IMAGE_PATH);
  return {
    title: OFFERS_SEO_TITLE,
    description: OFFERS_SEO_DESCRIPTION,
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      type: "website",
      url,
      title: OFFERS_SEO_TITLE,
      description: OFFERS_SEO_DESCRIPTION,
      siteName: SITE.name,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: OFFERS_H1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: OFFERS_SEO_TITLE,
      description: OFFERS_SEO_DESCRIPTION,
      images: [image],
    },
  };
}
