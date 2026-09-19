import { describe, expect, it } from "vitest";
import { BURRITO_PROMPT, parseProcess } from "@/lib/parse-process";
import { generateTemplateGraph } from "@/lib/template-graph";

describe("prose process parser", () => {
  it("maps the burrito prompt into prelude + oven/microwave branches", () => {
    const parsed = parseProcess(BURRITO_PROMPT);
    expect(parsed.prelude.length).toBeGreaterThanOrEqual(2);
    expect(parsed.prelude.join(" ").toLowerCase()).toMatch(/freezer/);
    expect(parsed.prelude.join(" ").toLowerCase()).toMatch(/packaging/);
    expect(parsed.decision).toBeTruthy();
    expect(parsed.decision?.question.toLowerCase()).toMatch(/oven/);
    expect(parsed.decision?.question.toLowerCase()).toMatch(/microwave/);
    expect(parsed.decision?.question.toLowerCase()).not.toMatch(/freezer/);

    const yes = parsed.decision?.yesSteps.join(" ").toLowerCase() ?? "";
    const no = parsed.decision?.noSteps.join(" ").toLowerCase() ?? "";
    expect(yes).toMatch(/baking sheet|oven-safe/);
    expect(yes).toMatch(/450/);
    expect(yes).toMatch(/22/);
    expect(yes).toMatch(/spatula|cool/);
    expect(no).toMatch(/paper plate/);
    expect(no).toMatch(/start|1\.5|minute/);
    expect(no).toMatch(/cool|2 minute/);
    expect(no).not.toMatch(/handle the no/);
    expect(parsed.decision?.yesSteps.some((step) => /baking sheet|oven-safe/i.test(step))).toBe(true);
    expect(parsed.decision?.noSteps.some((step) => /paper plate/i.test(step))).toBe(true);
    expect(parsed.decision?.noSteps.some((step) => /start/i.test(step))).toBe(true);
    expect(parsed.prelude[0].toLowerCase().startsWith("we ")).toBe(false);
  });

  it("builds a multi-step burrito flowchart without a placeholder no-path", () => {
    const graph = generateTemplateGraph(BURRITO_PROMPT);
    const steps = graph.nodes.filter((node) => node.kind === "step");
    const decisions = graph.nodes.filter((node) => node.kind === "decision");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].label.toLowerCase()).toMatch(/oven or microwave/);
    expect(steps.length).toBeGreaterThanOrEqual(8);
    expect(graph.nodes.some((node) => /handle the no/i.test(node.label))).toBe(false);

    const decision = decisions[0];
    const yes = graph.edges.find((edge) => edge.source === decision.id && edge.label === "yes");
    const no = graph.edges.find((edge) => edge.source === decision.id && edge.label === "no");
    expect(yes).toBeTruthy();
    expect(no).toBeTruthy();

    const labels = graph.nodes.map((node) => node.label.toLowerCase()).join(" | ");
    expect(labels).toMatch(/freezer/);
    expect(labels).toMatch(/packaging/);
    expect(labels).toMatch(/baking sheet|oven-safe/);
    expect(labels).toMatch(/450/);
    expect(labels).toMatch(/paper plate/);
    expect(labels).toMatch(/spatula|cool/);
    expect(steps.filter((node) => /450|22 minute|baking sheet|oven-safe/i.test(node.label)).length).toBeGreaterThanOrEqual(2);
    expect(steps.filter((node) => /paper plate|start|microwave/i.test(node.label)).length).toBeGreaterThanOrEqual(2);
  });
});
