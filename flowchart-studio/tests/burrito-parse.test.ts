import { describe, expect, it } from "vitest";
import { BURRITO_PROMPT, CASH_REGISTER_PROMPT, TEA_PROMPT, parseProcess } from "@/lib/parse-process";
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

  it("maps the tea prompt into prelude + milk/black branches + shared finally", () => {
    const parsed = parseProcess(TEA_PROMPT);
    expect(parsed.prelude.join(" ").toLowerCase()).toMatch(/kettle|boil/);
    expect(parsed.prelude.join(" ").toLowerCase()).toMatch(/tea bag|mug/);
    expect(parsed.prelude.join(" ").toLowerCase()).toMatch(/pour|boiling/);
    expect(parsed.decision).toBeTruthy();
    expect(parsed.decision?.question.toLowerCase()).toMatch(/milk/);
    expect(parsed.decision?.question.toLowerCase()).toMatch(/black/);
    expect(parsed.decision?.question.toLowerCase()).not.toMatch(/kettle/);

    const yes = parsed.decision?.yesSteps.join(" ").toLowerCase() ?? "";
    const no = parsed.decision?.noSteps.join(" ").toLowerCase() ?? "";
    expect(yes).toMatch(/five|5/);
    expect(yes).toMatch(/milk/);
    expect(no).toMatch(/three|3/);
    expect(no).not.toMatch(/handle the no/);
    expect(parsed.prelude.some((step) => /^while\b/i.test(step))).toBe(false);
    expect(parsed.epilogue.some((step) => /^finally$/i.test(step))).toBe(false);
    expect(parsed.epilogue.join(" ").toLowerCase()).toMatch(/remove|discard/);
    expect(parsed.epilogue.join(" ").toLowerCase()).toMatch(/cool/);
    expect(yes).not.toMatch(/discard/);
    expect(no).not.toMatch(/discard/);
  });

  it("builds a branched tea flowchart that joins after both steep paths", () => {
    const graph = generateTemplateGraph(TEA_PROMPT);
    const steps = graph.nodes.filter((node) => node.kind === "step");
    const decisions = graph.nodes.filter((node) => node.kind === "decision");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].label.toLowerCase()).toMatch(/milk or black/);
    expect(steps.length).toBeGreaterThanOrEqual(6);
    expect(graph.nodes.some((node) => /handle the no/i.test(node.label))).toBe(false);

    const decision = decisions[0];
    const yes = graph.edges.find((edge) => edge.source === decision.id && edge.label === "yes");
    const no = graph.edges.find((edge) => edge.source === decision.id && edge.label === "no");
    expect(yes).toBeTruthy();
    expect(no).toBeTruthy();

    const labels = graph.nodes.map((node) => node.label.toLowerCase()).join(" | ");
    expect(labels).toMatch(/kettle|boil/);
    expect(labels).toMatch(/tea bag|mug/);
    expect(labels).toMatch(/five|5/);
    expect(labels).toMatch(/three|3/);
    expect(labels).toMatch(/remove|discard/);
    expect(labels).toMatch(/cool/);

    const merge = graph.nodes.find((node) => node.id === "m1") ??
      graph.nodes.find((node) => /^remove/i.test(node.label));
    expect(merge).toBeTruthy();
    const intoMerge = graph.edges.filter((edge) => edge.target === merge?.id);
    expect(intoMerge.length).toBeGreaterThanOrEqual(2);
  });

  it("maps cash-register interrogative plus bare If yes / If no", () => {
    const parsed = parseProcess(CASH_REGISTER_PROMPT);
    expect(parsed.prelude).toHaveLength(1);
    expect(parsed.prelude[0].toLowerCase()).toMatch(/open the cash register/);
    expect(parsed.decision).toBeTruthy();
    expect(parsed.decision?.question.toLowerCase()).toMatch(/cash register loaded/);
    expect(parsed.decision?.question.toLowerCase()).not.toMatch(/^second/);
    expect(parsed.decision?.yesSteps.join(" ").toLowerCase()).toMatch(/pull money out/);
    expect(parsed.decision?.noSteps.join(" ").toLowerCase()).toMatch(/don'?t pull money out|do not pull money out/);
    expect(parsed.prelude.some((step) => /\?|if yes|if no/i.test(step))).toBe(false);
  });

  it("builds a cash-register diamond instead of a vertical line", () => {
    const graph = generateTemplateGraph(CASH_REGISTER_PROMPT);
    const decisions = graph.nodes.filter((node) => node.kind === "decision");
    expect(decisions).toHaveLength(1);
    expect(decisions[0].label.toLowerCase()).toMatch(/cash register loaded/);
    expect(graph.nodes.some((node) => node.kind === "step" && /if yes/i.test(node.label))).toBe(false);
    expect(graph.nodes.some((node) => /handle the no/i.test(node.label))).toBe(false);

    const decision = decisions[0];
    const yes = graph.edges.find((edge) => edge.source === decision.id && edge.label === "yes");
    const no = graph.edges.find((edge) => edge.source === decision.id && edge.label === "no");
    expect(yes).toBeTruthy();
    expect(no).toBeTruthy();
    expect(graph.nodes.find((node) => node.id === yes?.target)?.label.toLowerCase()).toMatch(/pull money out/);
    expect(graph.nodes.find((node) => node.id === no?.target)?.label.toLowerCase()).toMatch(/don'?t pull|do not pull/);
  });

  it("treats Yes: / No: labels as branch arms after a question", () => {
    const parsed = parseProcess(
      "Is the drawer open?\nYes: count the bills.\nNo: unlock the drawer.",
    );
    expect(parsed.decision?.question.toLowerCase()).toMatch(/drawer open/);
    expect(parsed.decision?.yesSteps.join(" ").toLowerCase()).toMatch(/count the bills/);
    expect(parsed.decision?.noSteps.join(" ").toLowerCase()).toMatch(/unlock the drawer/);
  });

  it("maps ask-if X or Y plus If X / If Y into a diamond", () => {
    const prompt =
      "Walk to the front counter. Next ask if they want soup or salad. If soup, ladle the soup. If salad, plate the greens. Finally thank the guest.";
    const parsed = parseProcess(prompt);
    expect(parsed.decision?.question.toLowerCase()).toMatch(/soup/);
    expect(parsed.decision?.question.toLowerCase()).toMatch(/salad/);
    expect(parsed.decision?.yesSteps.join(" ").toLowerCase()).toMatch(/ladle/);
    expect(parsed.decision?.noSteps.join(" ").toLowerCase()).toMatch(/plate|greens/);
    expect(parsed.epilogue.join(" ").toLowerCase()).toMatch(/thank/);

    const graph = generateTemplateGraph(prompt);
    expect(graph.nodes.filter((node) => node.kind === "decision")).toHaveLength(1);
    expect(graph.nodes.some((node) => node.kind === "decision" && /soup|salad/i.test(node.label))).toBe(
      true,
    );
    expect(graph.edges.some((edge) => edge.label === "yes")).toBe(true);
    expect(graph.edges.some((edge) => edge.label === "no")).toBe(true);
  });
});
