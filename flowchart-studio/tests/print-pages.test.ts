import { describe, expect, it } from "vitest";
import { coerceGraph } from "@/lib/graph";
import { NODE_DIMS, layoutGraphPrint, shiftGraphToOrigin } from "@/lib/layout";
import { PRINT_PAGE_GRAPH_WIDTH, crossingEdges, paginatePrintMap } from "@/lib/print-pages";
import { demoGraph } from "@/lib/template-graph";

function wideChain(steps: number) {
  const nodes = [
    { id: "start", kind: "start", label: "Start" },
    ...Array.from({ length: steps }, (_, i) => ({
      id: `s${i + 1}`,
      kind: "step" as const,
      label: `Step ${i + 1}`,
    })),
    { id: "end", kind: "end", label: "End" },
  ];
  const ids = nodes.map((node) => node.id);
  const edges = ids.slice(0, -1).map((id, i) => ({
    id: `e${i}`,
    source: id,
    target: ids[i + 1],
  }));
  return coerceGraph({ title: "Wide", nodes, edges });
}

describe("print page slices", () => {
  it("keeps a typical onboarding map readable without splitting nodes", () => {
    const graph = demoGraph();
    const pages = paginatePrintMap(graph);
    expect(pages.length).toBeGreaterThanOrEqual(1);
    expect(pages.length).toBeLessThanOrEqual(2);
    const ids = pages.flatMap((page) => page.graph.nodes.map((node) => node.id));
    expect(new Set(ids).size).toBe(graph.nodes.length);
    if (pages.length > 1) {
      expect(pages[0].continueNext).toBe(true);
      expect(pages[pages.length - 1].continuePrev).toBe(true);
    }
  });

  it("never splits a shape across pages and only breaks mid-connector", () => {
    const graph = wideChain(8);
    const pages = paginatePrintMap(graph);
    expect(pages.length).toBeGreaterThan(1);

    const seen = new Set<string>();
    for (const page of pages) {
      for (const node of page.graph.nodes) {
        expect(seen.has(node.id)).toBe(false);
        seen.add(node.id);
        const dim = NODE_DIMS[node.kind];
        expect(node.position.x + dim.width).toBeLessThanOrEqual(PRINT_PAGE_GRAPH_WIDTH + 1);
      }
    }
    expect(seen.size).toBe(graph.nodes.length);

    const laid = shiftGraphToOrigin(layoutGraphPrint(graph));
    const firstIds = new Set(pages[0].graph.nodes.map((node) => node.id));
    expect(crossingEdges(laid, firstIds).length).toBeGreaterThan(0);

    expect(pages[0].continueNext).toBe(true);
    expect(pages[0].continuePrev).toBe(false);
    expect(pages[pages.length - 1].continuePrev).toBe(true);
    expect(pages[pages.length - 1].continueNext).toBe(false);
  });

  it("marks a rare backtrack when an edge returns to an earlier page", () => {
    const graph = coerceGraph({
      title: "Loop",
      nodes: [
        { id: "start", kind: "start", label: "Start" },
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `s${i + 1}`,
          kind: "step",
          label: `Step ${i + 1}`,
        })),
        { id: "end", kind: "end", label: "End" },
      ],
      edges: [
        { source: "start", target: "s1" },
        { source: "s1", target: "s2" },
        { source: "s2", target: "s3" },
        { source: "s3", target: "s4" },
        { source: "s4", target: "s5" },
        { source: "s5", target: "s6" },
        { source: "s6", target: "s7" },
        { source: "s7", target: "s8" },
        { source: "s8", target: "end" },
        { source: "s8", target: "s1" },
      ],
    });
    const pages = paginatePrintMap(graph);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.some((page) => page.backtrack)).toBe(true);
  });
});
