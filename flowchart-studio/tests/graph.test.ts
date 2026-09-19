import { describe, expect, it } from "vitest";
import {
  addStepAfter,
  coerceGraph,
  emptyGraph,
  findNodeByRef,
  listableNodes,
  removeNode,
  updateNodeKind,
  validateGraph,
} from "@/lib/graph";
import { layoutGraph } from "@/lib/layout";

describe("graph model", () => {
  it("creates a start/end graph that validates", () => {
    const graph = emptyGraph("Demo");
    expect(validateGraph(graph)).toBeNull();
    expect(graph.nodes.map((node) => node.kind)).toEqual(["start", "end"]);
  });

  it("coerces kind aliases, drops broken edges, and keeps labels", () => {
    const graph = coerceGraph({
      title: "Onboard",
      nodes: [
        { id: "a", type: "start", label: "Start", position: { x: 0, y: 0 } },
        { id: "b", kind: "step", label: "Call the client" },
        { id: "c", kind: "end", label: "End" },
      ],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "missing" },
        { source: "b", target: "c", label: "yes" },
      ],
    });
    expect(graph.nodes[0].kind).toBe("start");
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[1].sourceHandle).toBe("yes");
  });

  it("keeps list view in walk order and supports rename-by-ref", () => {
    let graph = emptyGraph();
    graph = addStepAfter(graph, "start", "Collect intake");
    graph = addStepAfter(graph, listableNodes(graph)[0].id, "Kickoff");
    const listed = listableNodes(graph);
    expect(listed.map((node) => node.label)).toEqual(["Collect intake", "Kickoff"]);
    expect(findNodeByRef(graph, "2")?.label).toBe("Kickoff");
    expect(findNodeByRef(graph, "intake")?.label).toBe("Collect intake");
  });

  it("refuses to delete start/end and layouts after edits", () => {
    let graph = addStepAfter(emptyGraph(), "start", "Do the work");
    const step = listableNodes(graph)[0];
    graph = updateNodeKind(graph, step.id, "decision");
    graph = layoutGraph(removeNode(graph, "start"));
    expect(graph.nodes.some((node) => node.kind === "start")).toBe(true);
    graph = layoutGraph(removeNode(graph, step.id));
    expect(listableNodes(graph)).toHaveLength(0);
    expect(graph.nodes.every((node) => Number.isFinite(node.position.y))).toBe(true);
  });
});
