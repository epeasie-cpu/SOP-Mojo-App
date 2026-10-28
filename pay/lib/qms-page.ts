import type { Metadata } from "next";
import { INDEX_ROBOTS } from "./robots";
import { SITE, absoluteUrl } from "./site";

export const QMS_CANONICAL_PATH = "/quality-management-software-fit-check";

export const QMS_TOOL_PATH = "/free/qms-check";

export const QMS_READY_PATH = "/free/qms-check/ready";

export const QMS_SEO_H1 = "Do you need a QMS?";

export const QMS_SEO_TITLE = "Do You Need a QMS? 2-Minute Quality System Fit Check | SOP Mojo";

export const QMS_SEO_DESCRIPTION =
  "Do you need a QMS? A free 2-minute quality management software fit check with a documentation score.";

export const QMS_ARTICLE_URL = "https://www.sopmojo.com/articles/quality-management-software";

export const QMS_BUILDER_PRO_GO = "https://pay.sopmojo.com/go/builder_pro";

/** The only Starter Kit URL this page may use. */
export const QMS_STARTER_KIT_URL = "https://www.sopmojo.com/lp/sop-starter-kit";

export const QMS_OG_IMAGE_PATH = `${QMS_CANONICAL_PATH}/opengraph-image`;

export const QMS_NOT_A_CERTIFICATION =
  "This is a fit check, not a certification and not legal advice. It does not say you pass or fail an audit.";

export const QMS_FAQ: { question: string; answer: string }[] = [
  {
    question: "What is a QMS?",
    answer:
      "A quality management system is how a business documents processes, controls changes, tracks problems, and shows that people were trained. Quality management software holds those records. The software does not replace written SOPs.",
  },
  {
    question: "Do I need quality management software?",
    answer:
      "This check sorts the answers into three fits: a simple SOP and checklist system, a field inspection tool, or a compliance-grade QMS. A regulated or audited answer points to the compliance-grade option. The result is a fit check, not a buying list.",
  },
  {
    question: "How is the process documentation score calculated?",
    answer:
      "Five answers are worth up to 25, 20, 20, 20, and 15 points: how many core processes are written down, where SOPs live, whether documents are reviewed, whether nonconformances and corrective actions are tracked, and how training is done. The score is the sum, from 0 to 100. Team size, industry, field work, and the main pain do not change the score.",
  },
  {
    question: "What if we are in a regulated industry?",
    answer:
      "The check recommends a compliance-grade QMS. Documented SOPs are still the foundation. This page does not name a vendor and is not an audit opinion.",
  },
  {
    question: "What does the email include?",
    answer:
      "Your category, your score, the largest gaps, and a 30-day action plan. The result on screen is free. The email is sent once per address.",
  },
  {
    question: "What does this cost?",
    answer:
      "The fit check costs $0. Builder Pro, a separate product for writing SOPs, is $39/mo. A compliance-grade QMS, if that is your result, is a different purchase. This page does not quote those prices.",
  },
];

export function qmsErrorMessage(code: string | undefined): string | null {
  if (code === "email") return "Enter a valid email.";
  if (code === "name") return "Enter your name.";
  if (code === "answers") return "Answer every question, then ask for the plan again.";
  if (code === "rate") return "Too many requests. Try again in a few minutes.";
  if (code === "send") return "We could not send your action plan. Try again in a minute.";
  return null;
}

export function qmsCanonicalUrl(): string {
  return absoluteUrl(QMS_CANONICAL_PATH);
}

export function qmsFormReturnPath(value: unknown): string {
  if (value === QMS_CANONICAL_PATH || value === QMS_TOOL_PATH) return value;
  return QMS_TOOL_PATH;
}

export function qmsSoftwareJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Quality System Fit Check",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: QMS_SEO_DESCRIPTION,
    url: qmsCanonicalUrl(),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function qmsFaqJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QMS_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function qmsLandingMetadata(): Metadata {
  const url = qmsCanonicalUrl();
  const image = absoluteUrl(QMS_OG_IMAGE_PATH);
  return {
    title: QMS_SEO_TITLE,
    description: QMS_SEO_DESCRIPTION,
    alternates: { canonical: url },
    robots: INDEX_ROBOTS,
    openGraph: {
      type: "website",
      url,
      title: QMS_SEO_TITLE,
      description: QMS_SEO_DESCRIPTION,
      siteName: SITE.name,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: QMS_SEO_H1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: QMS_SEO_TITLE,
      description: QMS_SEO_DESCRIPTION,
      images: [image],
    },
  };
}
