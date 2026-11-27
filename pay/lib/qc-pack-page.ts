import type { Metadata } from "next";
import { INDEX_ROBOTS } from "./robots";
import { SITE, absoluteUrl } from "./site";

export const QC_PACK_PATH = "/quality-control-starter-pack";

export const QC_PACK_READY_PATH = "/quality-control-starter-pack/ready";

export const QC_PACK_SEO_H1 = "Quality Control Starter Pack";

export const QC_PACK_SEO_TITLE = "Free Quality Control Starter Pack | SOP Mojo";

export const QC_PACK_SEO_DESCRIPTION =
  "Free Quality Control Starter Pack. Copy a one-week start, inspection checklist, CAPA log, KPI tracker, and SOP review log.";

export const QC_PACK_CHECK_URL = "https://pay.sopmojo.com/quality-management-software-fit-check";

export const QC_PACK_OG_IMAGE_PATH = `${QC_PACK_PATH}/opengraph-image`;

export const QC_PACK_FILES: { id: string; title: string; detail: string }[] = [
  { id: "00", title: "START HERE", detail: "Set up basic quality control in one week." },
  { id: "01", title: "Inspection Checklist", detail: "A Google Doc you copy." },
  { id: "02", title: "Nonconformance & CAPA Log", detail: "A Google Sheet you copy." },
  { id: "03", title: "Quality KPI Tracker", detail: "A Google Sheet you copy." },
  { id: "04", title: "SOP Review Log", detail: "A Google Sheet you copy." },
];

export const QC_PACK_FAQ: { question: string; answer: string }[] = [
  {
    question: "What is in the Quality Control Starter Pack?",
    answer:
      "Five files: 00 START HERE (set up basic quality control in one week), 01 Inspection Checklist, 02 Nonconformance & CAPA Log, 03 Quality KPI Tracker, and 04 SOP Review Log.",
  },
  {
    question: "What format are the files?",
    answer: "They are Google Docs and Google Sheets. You copy them into your own account.",
  },
  {
    question: "How do I get the pack?",
    answer: "Enter your name and email. We email the link once. The link is not posted on this page.",
  },
  {
    question: "What does this cost?",
    answer: "The pack is free. Builder Pro, a separate product for writing SOPs, is $39/mo.",
  },
  {
    question: "Is this a full quality management system?",
    answer:
      "No. It is a starter set of documents and sheets. A separate 2-minute check asks whether a simple SOP system, a field inspection app, or a compliance-grade QMS is the closer fit.",
  },
];

export function qcPackErrorMessage(code: string | undefined): string | null {
  if (code === "email") return "Enter a valid email.";
  if (code === "name") return "Enter your name.";
  if (code === "rate") return "Too many requests. Try again in a few minutes.";
  if (code === "send") return "We could not send the pack. Try again in a minute.";
  return null;
}

export function qcPackCanonicalUrl(): string {
  return absoluteUrl(QC_PACK_PATH);
}

export function qcPackFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QC_PACK_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function qcPackLandingMetadata(): Metadata {
  const url = qcPackCanonicalUrl();
  const image = absoluteUrl(QC_PACK_OG_IMAGE_PATH);
  return {
    title: QC_PACK_SEO_TITLE,
    description: QC_PACK_SEO_DESCRIPTION,
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      type: "website",
      url,
      title: QC_PACK_SEO_TITLE,
      description: QC_PACK_SEO_DESCRIPTION,
      siteName: SITE.name,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: QC_PACK_SEO_H1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: QC_PACK_SEO_TITLE,
      description: QC_PACK_SEO_DESCRIPTION,
      images: [image],
    },
  };
}
