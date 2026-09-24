import { describe, expect, it } from "vitest";
import { coerceGraph } from "@/lib/graph";
import {
  measurePrintNode,
  NODE_DIMS,
  PRINT_EDGE_GUTTER,
  PRINT_MAP_MAX_HEIGHT,
  PRINT_MAP_MAX_WIDTH,
  printMapBox,
  shiftGraphToOrigin,
} from "@/lib/layout";
import { continuationDraw, printEdgePath } from "@/lib/print-map";
import { demoGraph } from "@/lib/template-graph";

describe("print map pagination box", () => {
  it("shifts the LTR graph to the origin so empty pages are not reserved", () => {
    const printed = shiftGraphToOrigin(
      coerceGraph({
        title: "Shift",
        nodes: [
          { id: "a", kind: "start", label: "Start", position: { x: 400, y: 220 } },
          { id: "b", kind: "end", label: "End", position: { x: 700, y: 220 } },
        ],
        edges: [{ source: "a", target: "b" }],
      }),
    );
    const start = printed.nodes.find((node) => node.id === "a");
    expect(start?.position.x).toBe(0);
    expect(start?.position.y).toBe(0);
  });

  it("fits a typical onboarding map onto one landscape box", () => {
    const box = printMapBox(demoGraph());
    expect(box.width).toBeLessThanOrEqual(PRINT_MAP_MAX_WIDTH);
    expect(box.height).toBeLessThanOrEqual(PRINT_MAP_MAX_HEIGHT);
    expect(box.width).toBeGreaterThan(box.height);
    expect(box.graph.nodes.every((node) => node.position.x >= 0 && node.position.y >= 0)).toBe(true);
  });

  it("draws No off the bottom of the decision", () => {
    const box = printMapBox(demoGraph());
    const decision = box.graph.nodes.find((node) => node.kind === "decision");
    const no = box.graph.edges.find((edge) => edge.source === decision?.id && edge.label === "no");
    expect(no).toBeTruthy();
    const path = printEdgePath(box.graph, no!.id);
    expect(path).toBeTruthy();
    expect(path).toMatch(/^M /);
  });

  it("sizes a short step far below the on-screen card", () => {
    const box = measurePrintNode({ kind: "step", label: "Complete initial build" });
    expect(box.width).toBeLessThan(180);
    expect(box.height).toBeLessThan(50);
    expect(box.width * box.height).toBeLessThan(NODE_DIMS.step.width * NODE_DIMS.step.height * 0.35);
  });

  it("runs a forward continuation to the right edge and in from the left", () => {
    const node = {
      id: "s1",
      kind: "step" as const,
      label: "Sign routing ticket",
      position: { x: 0, y: 0 },
    };
    const dim = measurePrintNode(node);
    const exit = continuationDraw(node, { nodeId: "s1", role: "exit", side: "right" }, 0, 1);
    expect(exit.nodeX).toBe(dim.width);
    expect(exit.y).toBe(dim.height / 2);
    expect(exit.side).toBe("right");

    const enter = continuationDraw(
      node,
      { nodeId: "s1", role: "enter", side: "left" },
      PRINT_EDGE_GUTTER,
      1,
    );
    expect(enter.nodeX).toBe(PRINT_EDGE_GUTTER);
    expect(enter.side).toBe("left");
    expect(enter.y).toBe(exit.y);
  });
});
