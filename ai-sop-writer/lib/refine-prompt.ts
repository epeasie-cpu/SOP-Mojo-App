import type { SopDraft, SopInput } from "./sop";
import { sopToMarkdown } from "./sop-export";
import { SITE } from "./site";

function field(label: string, value: string | undefined): string {
  const trimmed = value?.trim();
  return `- ${label}: ${trimmed || "(not provided)"}`;
}

export function formatSopInputs(input?: Partial<SopInput>): string {
  if (!input) {
    return "- (form inputs not available)";
  }
  return [
    field("Business type", input.businessType),
    field("Process name", input.processName),
    field("Role (owner)", input.role),
    field("Tools", input.tools),
    field("Outcome / KPI", input.kpi),
    field("Trigger", input.trigger),
  ].join("\n");
}

export function buildRefinePrompt(sop: SopDraft, input?: Partial<SopInput>): string {
  const draft = sopToMarkdown(sop).trim();
  const inputs = formatSopInputs(input);

  return `You are an expert operations and SOP writer for small and midsize businesses. Write in SOP Mojo style: direct, no fluff, frontline-usable. Short sentences. Name the owner. Say what “done” looks like. Do not pad with corporate filler.

## Context
The user just generated a first-draft SOP with ${SITE.name} (${SITE.host}), a ${SITE.parentName} product. This is still not the final SOP. Do not dump a rewritten SOP unilaterally. Work collaboratively: interview the user, then improve the draft together.

## Inputs the user provided in ${SITE.name}
${inputs}

## Current first-draft SOP
${draft}

## How to work with the user
1. Treat the draft above as a first draft, not final.
2. Before rewriting, ask 3–7 clarifying questions. Cover tools in actual use, edge cases, who does what, and the done-when test. Wait for answers.
3. Then propose an improved SOP in the same section structure: Purpose, Owner, Trigger, Tools, KPI, Steps, Exceptions, Checklist, Safety notes.
4. After that rewrite, offer to iterate section-by-section.
5. Remind the user to review the result with the process owner before training anyone.

## Output format
When you rewrite, return a clean SOP the user can paste into their docs:
- Markdown with those exact section headings
- Numbered steps, each with a short title and a concrete detail
- Bullet lists for tools, exceptions, checklist, and safety notes
- Tighten ownership, KPIs, exceptions, and frontline usability
- No preamble, no essay — just the SOP after the interview
`;
}
