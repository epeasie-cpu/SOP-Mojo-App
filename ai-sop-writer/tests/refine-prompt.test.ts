import { describe, expect, it } from "vitest";
import { buildRefinePrompt, formatSopInputs } from "@/lib/refine-prompt";
import { SITE } from "@/lib/site";
import type { SopDraft, SopInput } from "@/lib/sop";
import { generateTemplateSop } from "@/lib/template-engine";

const input: SopInput = {
  businessType: "Residential and light-commercial trades",
  processName: "On-site service job from arrival to close-out",
  role: "Lead technician",
  tools: "Work-order app, PPE",
  kpi: "First-time fix rate",
  trigger: "Dispatched work order",
};

function sampleSop(): SopDraft {
  return generateTemplateSop(input);
}

describe("formatSopInputs", () => {
  it("lists every generator field", () => {
    const text = formatSopInputs(input);
    expect(text).toContain("Business type: Residential and light-commercial trades");
    expect(text).toContain("Process name: On-site service job from arrival to close-out");
    expect(text).toContain("Role (owner): Lead technician");
    expect(text).toContain("Tools: Work-order app, PPE");
    expect(text).toContain("Outcome / KPI: First-time fix rate");
    expect(text).toContain("Trigger: Dispatched work order");
  });

  it("marks missing optional fields instead of dropping them", () => {
    const text = formatSopInputs({
      businessType: "Hotel",
      processName: "Guest room turnover",
      role: "Housekeeper",
    });
    expect(text).toContain("Tools: (not provided)");
    expect(text).toContain("Outcome / KPI: (not provided)");
    expect(text).toContain("Trigger: (not provided)");
  });

  it("handles a missing input object", () => {
    expect(formatSopInputs()).toContain("form inputs not available");
  });
});

describe("buildRefinePrompt", () => {
  it("builds a collaborative refine prompt with draft, inputs, and SOP Mojo framing", () => {
    const sop = sampleSop();
    const prompt = buildRefinePrompt(sop, input);

    expect(prompt).toContain("expert operations and SOP writer");
    expect(prompt).toContain("SOP Mojo");
    expect(prompt).toContain("direct, no fluff");
    expect(prompt).toContain(SITE.name);
    expect(prompt).toContain(SITE.host);
    expect(prompt).toContain("still not the final SOP");
    expect(prompt).toContain("Do not dump a rewritten SOP unilaterally");
    expect(prompt).toContain("ask 3–7 clarifying questions");
    expect(prompt).toContain("iterate section-by-section");
    expect(prompt).toContain("review the result with the process owner");
    expect(prompt).toContain("Purpose, Owner, Trigger, Tools, KPI, Steps, Exceptions, Checklist, Safety notes");

    expect(prompt).toContain(`# ${sop.title}`);
    expect(prompt).toContain("## Purpose");
    expect(prompt).toContain(sop.purpose);
    expect(prompt).toContain("## Owner");
    expect(prompt).toContain(sop.owner);
    expect(prompt).toContain("## Trigger");
    expect(prompt).toContain(sop.trigger);
    expect(prompt).toContain("## Tools");
    expect(prompt).toContain("## KPI");
    expect(prompt).toContain("## Steps");
    expect(prompt).toContain("## Exceptions");
    expect(prompt).toContain("## Checklist");
    expect(prompt).toContain("## Safety notes");

    expect(prompt).toContain("Business type: Residential and light-commercial trades");
    expect(prompt).toContain("Role (owner): Lead technician");
    expect(prompt).toContain("Work-order app, PPE");
  });

  it("tells the chat AI to wait for answers before rewriting and to return paste-ready Markdown", () => {
    const prompt = buildRefinePrompt(sampleSop(), input);
    expect(prompt).toContain("Wait for answers");
    expect(prompt).toContain("paste into their docs");
    expect(prompt).toContain("Numbered steps");
    expect(prompt).toContain("Bullet lists for tools, exceptions, checklist, and safety notes");
  });
});
