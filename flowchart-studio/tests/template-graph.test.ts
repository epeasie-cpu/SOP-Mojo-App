import { describe, expect, it } from "vitest";
import { demoGraph, generateTemplateGraph } from "@/lib/template-graph";

describe("template graph", () => {
  it("turns a numbered process into steps plus a decision", () => {
    const graph = generateTemplateGraph(`Client onboarding
1. Capture the request
2. If intake is complete?
3. Send the welcome pack`);
    expect(graph.title).toBe("Client onboarding");
    expect(graph.nodes.some((node) => node.kind === "start")).toBe(true);
    expect(graph.nodes.some((node) => node.kind === "end")).toBe(true);
    expect(graph.nodes.some((node) => node.kind === "decision")).toBe(true);
    expect(graph.edges.some((edge) => edge.label === "no")).toBe(true);
    expect(graph.nodes.every((node) => node.position.y >= 0)).toBe(true);
  });

  it("still maps a single paragraph", () => {
    const graph = generateTemplateGraph("Open the mail, stamp it, and file it.");
    expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(graph.edges.length).toBeGreaterThanOrEqual(2);
  });

  it("layouts the looping demo graph", () => {
    const graph = demoGraph();
    expect(graph.nodes.some((node) => node.kind === "decision")).toBe(true);
    expect(graph.nodes.every((node) => Number.isFinite(node.position.y))).toBe(true);
  });
});
