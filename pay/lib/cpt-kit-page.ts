import type { Metadata } from "next";
import { INDEX_ROBOTS } from "./robots";
import { SITE, absoluteUrl } from "./site";
import { QMS_BUILDER_PRO_GO } from "./qms-page";

export const CPT_KIT_PATH = "/2027-slp-cpt-kit";

export const CPT_KIT_READY_PATH = "/2027-slp-cpt-kit/ready";

export const CPT_KIT_SEO_TITLE = "2027 SLP CPT Code Transition Kit (Free) | SOP Mojo";

export const CPT_KIT_SEO_H1 = "2027 SLP CPT Code Transition Kit (Free)";

export const CPT_KIT_SEO_DESCRIPTION =
  "Free kit for small pediatric speech, OT, and PT practices. CPT 92507 is deleted after 12/31/2026. Job aid and a minutes-to-units calculator.";

export const CPT_KIT_PAGE_URL = "https://pay.sopmojo.com/2027-slp-cpt-kit";

export const CPT_KIT_OG_IMAGE_PATH = `${CPT_KIT_PATH}/opengraph-image`;

export const CPT_KIT_DISCLAIMER = "Educational, not billing advice.";

export const CPT_KIT_UPSELL = "Builder Pro is $39/mo. It is for writing the SOPs your practice follows.";

export const CPT_KIT_BUILDER_PRO_GO = QMS_BUILDER_PRO_GO;

export const CPT_KIT_PARTS: { title: string; detail: string }[] = [
  {
    title: "One-page job aid",
    detail: "What changes when CPT 92507 is deleted after 12/31/2026.",
  },
  {
    title: "Minutes-to-units calculator",
    detail: "You enter your own payer rates. The kit does not include sample rates.",
  },
];

export const CPT_KIT_FAQ: { question: string; answer: string }[] = [
  {
    question: "What happens to CPT 92507?",
    answer:
      "CPT 92507 is deleted after 12/31/2026. On 1/1/2027 it is replaced by new timed base and add-on code pairs.",
  },
  {
    question: "What is in the kit?",
    answer:
      "A one-page job aid and a minutes-to-units calculator. You enter your own payer rates. We email the link. It is not posted on this page.",
  },
  {
    question: "Who is this for?",
    answer: "Small pediatric speech, occupational therapy, and physical therapy practices.",
  },
  {
    question: "Is this billing advice?",
    answer: "No. Educational, not billing advice.",
  },
];

export function cptKitErrorMessage(code: string | undefined): string | null {
  if (code === "email") return "Enter a valid email.";
  if (code === "name") return "Enter your name.";
  if (code === "rate") return "Too many requests. Try again in a few minutes.";
  if (code === "send") return "We could not send the kit. Try again in a minute.";
  return null;
}

export function cptKitCanonicalUrl(): string {
  return absoluteUrl(CPT_KIT_PATH);
}

export function cptKitFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CPT_KIT_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function cptKitLandingMetadata(): Metadata {
  const url = cptKitCanonicalUrl();
  const image = absoluteUrl(CPT_KIT_OG_IMAGE_PATH);
  return {
    title: CPT_KIT_SEO_TITLE,
    description: CPT_KIT_SEO_DESCRIPTION,
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      type: "website",
      url,
      title: CPT_KIT_SEO_TITLE,
      description: CPT_KIT_SEO_DESCRIPTION,
      siteName: SITE.name,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: CPT_KIT_SEO_H1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: CPT_KIT_SEO_TITLE,
      description: CPT_KIT_SEO_DESCRIPTION,
      images: [image],
    },
  };
}
