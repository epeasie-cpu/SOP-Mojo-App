import { describe, expect, it } from "vitest";
import { applyChatFallback } from "@/lib/chat-fallback";
import { addStepAfter, emptyGraph, listableNodes } from "@/lib/graph";

function seeded() {
  let graph = emptyGraph("Invoice");
  graph = addStepAfter(graph, "start", "Receive invoice");
  graph = addStepAfter(graph, listableNodes(graph)[0].id, "Pay invoice");
  return graph;
}

describe("chat fallback", () => {
  it("makes a numbered step a yes/no branch", () => {
    const result = applyChatFallback(seeded(), "make step 2 a yes/no branch");
    expect(result.applied).toBe(true);
    const decision = result.graph.nodes.find((node) => node.label === "Pay invoice");
    expect(decision?.kind).toBe("decision");
    expect(result.graph.edges.some((edge) => edge.label === "no")).toBe(true);
  });

  it("deletes by number and renames by label", () => {
    const deleted = applyChatFallback(seeded(), "delete step 1");
    expect(deleted.graph.nodes.some((node) => node.label === "Receive invoice")).toBe(false);
    const renamed = applyChatFallback(deleted.graph, "rename Pay invoice to Approve payment");
    expect(renamed.graph.nodes.some((node) => node.label === "Approve payment")).toBe(true);
  });

  it("adds a step and explains unknown commands", () => {
    const added = applyChatFallback(seeded(), "add a step called File the PDF");
    expect(added.applied).toBe(true);
    expect(listableNodes(added.graph).some((node) => node.label === "File the PDF")).toBe(true);
    const unknown = applyChatFallback(seeded(), "paint it blue");
    expect(unknown.applied).toBe(false);
    expect(unknown.reply.toLowerCase()).toContain("without an ai key");
  });
});
