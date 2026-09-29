import { AUDIENCE, SITE } from "./site";

/** Target queries for audit.sopmojo.com. Kept in the README as well. */
export const TARGET_KEYWORDS = [
  "business operations audit",
  "exit readiness",
  "ops scalability",
  "ops scalability score",
  "AI readiness for SMBs",
  "exit freedom readiness",
  "SOP Mojo",
] as const;

export type SeoPage = {
  path: "/" | "/score" | "/faq";
  /** Unique document title before the parent suffix. */
  title: string;
  description: string;
  heading: string;
  changefreq: "weekly" | "monthly";
  priority: number;
  lastmod: string;
};

export const LASTMOD = "2026-09-29";

export const PAGES: SeoPage[] = [
  {
    path: "/",
    title: "Exit / Freedom Readiness | Business Operations Audit",
    description:
      `Free business operations audit and exit readiness score for ${AUDIENCE}. SOP Mojo’s Ops Scalability Score takes about three minutes and does not invent a valuation.`,
    heading: "Exit / Freedom Readiness",
    changefreq: "weekly",
    priority: 1,
    lastmod: LASTMOD,
  },
  {
    path: "/score",
    title: "Ops Scalability Score | Exit Readiness for SMBs",
    description:
      "What the Ops Scalability Score shows: a 0–100 band, the two gaps to fix first, and six directional reads, including AI readiness for SMBs.",
    heading: "Ops Scalability Score",
    changefreq: "monthly",
    priority: 0.8,
    lastmod: LASTMOD,
  },
  {
    path: "/faq",
    title: "Ops Scalability Score FAQ",
    description:
      "Plain answers about the SOP Mojo Exit / Freedom Readiness score: who it is for, how scoring works, and why sellability is not a valuation.",
    heading: "Ops Scalability Score FAQ",
    changefreq: "monthly",
    priority: 0.6,
    lastmod: LASTMOD,
  },
];

export function pageByPath(path: SeoPage["path"]): SeoPage {
  const page = PAGES.find((item) => item.path === path);
  if (!page) throw new Error(`Missing page ${path}`);
  return page;
}

export type FaqItem = { question: string; answer: string };

export const FAQS: FaqItem[] = [
  {
    question: "What is the Exit / Freedom Readiness score?",
    answer:
      `It is a free ops scalability score from SOP Mojo at https://audit.sopmojo.com. ${AUDIENCE[0].toUpperCase()}${AUDIENCE.slice(1)} answer a short audit and get a 0–100 read on whether the work can run when they are not in the room.`,
  },
  {
    question: "Who is the Ops Scalability Score for?",
    answer:
      "Operations teams and leaders: ops managers, team leads, and anyone who owns how work runs. That includes people who want an exit, more time with family, a real stretch away, or less chaos in the week they already have.",
  },
  {
    question: "Is this a business valuation or an industry multiple?",
    answer:
      "No. Sellability is a directional band: lower, middle, or higher. It is an estimate from your answers. It is not a valuation and it is not an industry multiple.",
  },
  {
    question: "How does the business operations audit work?",
    answer:
      "You pick a goal, answer eight core questions from memory, then two questions for that goal. Eleven questions total. The goal question only chooses the add-ons. The headline score uses the other ten.",
  },
  {
    question: "What do Fragile, Building, and Ready mean?",
    answer:
      "0–39 is Fragile, key-person dependent. 40–69 is Building, not yet scalable. 70–100 is Ready, the core work can run without you.",
  },
  {
    question: "What stays visible before email?",
    answer: "The 0–100 score, the band label, and the two gaps to fix first.",
  },
  {
    question: "What does email unlock?",
    answer:
      "Six directional reads: sellability, ops readiness, AI implementation readiness, peer band, buyer diligence risk, and absentee run-rate. You can request a call to discuss documenting the workflows. The score is free. Email is how the report opens.",
  },
  {
    question: "How long does the exit readiness score take?",
    answer:
      "About three minutes. The questions are answerable from memory. You do not call staff or search your files.",
  },
  {
    question: "Why does AI readiness depend on documentation?",
    answer:
      "AI needs documentation as the source of truth. Without SOPs and maps, automation means re-teaching the model every week. AI amplifies what's written down. Tribal knowledge stays tribal. Document first, then automate.",
  },
];

export const HOME_SECTIONS = [
  {
    id: "audit",
    heading: "Business operations audit",
    body: "This audit is a gut check on your systems. It shows how documented, covered, and ready the work is to scale, hand off, or feed AI. You answer from memory in about three minutes. Nobody has to call staff or hunt through files. If a key person is out and the work waits, that is a missing handoff.",
  },
  {
    id: "exit",
    heading: "Exit readiness",
    body: "A buyer can only underwrite what they can see. Stories in your head become a diligence discount. The score names a directional sellability band. It will not invent an industry multiple or a valuation.",
  },
  {
    id: "scale",
    heading: "Ops scalability",
    body: "The headline is 0–100 with a plain band: Fragile, Building, or Ready. The two gaps to fix first stay visible before any email. The deeper reads open after you add an address.",
  },
  {
    id: "ai",
    heading: "AI readiness for SMBs",
    body: "AI needs documentation as the source of truth. Without SOPs and maps, automation means re-teaching the model every week. AI amplifies what's written down. Tribal knowledge stays tribal. After email, the report includes an AI implementation readiness read based on how written, consistent, and mapped the work is.",
  },
] as const;

export const SCORE_METRICS = [
  {
    title: "Sellability",
    text: "A directional band for what a buyer might pay: lower, middle, or higher. An estimate from your answers. Not a valuation and not an industry multiple.",
  },
  {
    title: "Ops readiness",
    text: "Whether ordinary work can continue when you are not available.",
  },
  {
    title: "AI implementation readiness",
    text: "AI needs documentation as the source of truth. Without SOPs and maps, automation means re-teaching the model every week. The read is based on documentation, consistent tools, and maps.",
  },
  {
    title: "Peer band",
    text: "A directional comparison with similar owner-led SMBs. It is from this quiz, not a market study.",
  },
  {
    title: "Buyer diligence risk",
    text: "How painful a buyer’s questions would feel, from high to lower.",
  },
  {
    title: "Absentee run-rate",
    text: "A directional read on how long core work continues before it stalls. Not a stopwatch.",
  },
] as const;

export function absolutePageUrl(path: SeoPage["path"]): string {
  return path === "/" ? SITE.host : `${SITE.host}${path}`;
}
