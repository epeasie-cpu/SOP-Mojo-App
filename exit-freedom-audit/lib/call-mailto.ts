import type { ShareSummary } from "./score";

/** The only Request a call recipient. */
export const CALL_TO = "ryan@sopmojo.com";

export const CALL_ASK =
  "I want a call or meeting to discuss how SOP Mojo can help document our workflows.";

export function buildCallMailto(summary: Pick<ShareSummary, "score" | "bandLabel" | "gaps">): string {
  const subject = `Request a call — Ops Scalability Score ${summary.score}/100`;
  const gaps = summary.gaps.map((gap) => `• ${gap.replace(/[\r\n]+/g, " ").trim()}`);
  const body = [
    CALL_ASK,
    "",
    `Score: ${summary.score}/100`,
    `Band: ${summary.bandLabel}`,
    "",
    "Top gaps",
    ...gaps,
  ].join("\n");
  return `mailto:${CALL_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
