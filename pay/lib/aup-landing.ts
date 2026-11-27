import type { Metadata } from "next";
import { FREE_AUP_PATH } from "./library";
import { INDEX_ROBOTS } from "./robots";
import { SITE, absoluteUrl } from "./site";

/** Keyword URL. It matches "acceptable use policy generator" more closely than /free/aup-generator. */
export const AUP_CANONICAL_PATH = "/acceptable-use-policy-generator";

export const AUP_SEO_H1 = "Free acceptable use policy generator";

export const AUP_SEO_TITLE = "Free Acceptable Use Policy Generator | SOP Mojo";

export const AUP_SEO_DESCRIPTION =
  "Free acceptable use policy generator for small businesses. Draft a template covering devices, email, internet, data, and BYOD. We email your access link.";

export const AUP_SHARE_LINE = "Know a business owner who needs one? Share this free tool";

export const AUP_NOT_LEGAL_ADVICE =
  "This is not legal advice. A policy from this generator is a starting point. Have a qualified attorney review it before you rely on it.";

export const AUP_OG_IMAGE_PATH = `${AUP_CANONICAL_PATH}/opengraph-image`;

export const AUP_FAQ: { question: string; answer: string }[] = [
  {
    question: "What is an acceptable use policy?",
    answer:
      "An acceptable use policy is a written set of expectations for how people use company devices, email, internet access, and data. It is not a guarantee that a rule is legal or enforceable.",
  },
  {
    question: "Who needs an acceptable use policy template?",
    answer:
      "Small businesses, MSP clients, and remote teams use one when people share company email, files, or devices. An AUP for a small business can be short and still name what is allowed and what happens if it is ignored.",
  },
  {
    question: "What does an IT acceptable use policy example cover?",
    answer:
      "A typical outline covers devices, email, internet, data, social media, BYOD, and consequences. The outline on this page is generic. It is not a complete policy for your business.",
  },
  {
    question: "Is this employee acceptable use policy legal advice?",
    answer: AUP_NOT_LEGAL_ADVICE,
  },
  {
    question: "How does the free acceptable use policy generator work?",
    answer:
      "Enter your email. We send an access link. You use the tool to draft a policy, then review it before you ask anyone to follow it.",
  },
  {
    question: "What does the free tool cost?",
    answer: "The Acceptable Use Policy Generator costs $0. Builder Pro, a separate product for turning policies into SOPs, is $39/mo.",
  },
];

export const AUP_OUTLINE: { title: string; detail: string }[] = [
  { title: "Purpose", detail: "Why the business has this policy." },
  { title: "Who it applies to", detail: "Employees, contractors, and anyone with access." },
  { title: "Devices and accounts", detail: "Company computers, phones, and logins." },
  { title: "Email", detail: "What company email is for, including forwarding." },
  { title: "Internet and social media", detail: "Expected use of the network and public posts." },
  { title: "Data", detail: "What information stays inside the business, and where it may be stored." },
  { title: "BYOD", detail: "Rules for personal phones and laptops used for work." },
  { title: "Consequences", detail: "Access may be removed, and any other steps the business decides on." },
  { title: "Acknowledgement", detail: "A place for the person to confirm they read it." },
];

export const AUP_STEPS = [
  "Enter your email, and your first name if you want.",
  "We email your access link. Check your junk and spam folder too.",
  "Open the generator, draft your policy from the outline, and have a qualified person review it before you adopt it.",
];

export function aupCanonicalUrl(): string {
  return absoluteUrl(AUP_CANONICAL_PATH);
}

export function aupFormReturnPath(value: unknown): string {
  if (value === AUP_CANONICAL_PATH || value === FREE_AUP_PATH) return value;
  return FREE_AUP_PATH;
}

export function aupSoftwareJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Acceptable Use Policy Generator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: AUP_SEO_DESCRIPTION,
    url: aupCanonicalUrl(),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function aupFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: AUP_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function aupLandingMetadata(): Metadata {
  const url = aupCanonicalUrl();
  const image = absoluteUrl(AUP_OG_IMAGE_PATH);
  return {
    title: AUP_SEO_TITLE,
    description: AUP_SEO_DESCRIPTION,
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      type: "website",
      url,
      title: AUP_SEO_TITLE,
      description: AUP_SEO_DESCRIPTION,
      siteName: SITE.name,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: AUP_SEO_H1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: AUP_SEO_TITLE,
      description: AUP_SEO_DESCRIPTION,
      images: [image],
    },
  };
}
