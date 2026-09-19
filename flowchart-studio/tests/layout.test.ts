import { describe, expect, it } from "vitest";
import { coerceGraph } from "@/lib/graph";
import { layoutGraph } from "@/lib/layout";
import { demoGraph } from "@/lib/template-graph";

describe("decision layout", () => {
  it("puts No left and Yes right of the diamond with distinct handles", () => {
    const graph = demoGraph();
    const decision = graph.nodes.find((node) => node.kind === "decision");
    if (!decision) throw new Error("expected a decision node");
    const yes = graph.edges.find((edge) => edge.source === decision.id && edge.label === "yes");
    const no = graph.edges.find((edge) => edge.source === decision.id && edge.label === "no");
    expect(yes?.sourceHandle).toBe("yes");
    expect(no?.sourceHandle).toBe("no");
    expect(yes?.sourceHandle).not.toBe(no?.sourceHandle);

    const yesNode = graph.nodes.find((node) => node.id === yes?.target);
    const noNode = graph.nodes.find((node) => node.id === no?.target);
    if (!yesNode || !noNode) throw new Error("expected yes/no children");
    expect(noNode.position.x + 80).toBeLessThan(decision.position.x);
    expect(yesNode.position.x).toBeGreaterThan(decision.position.x + 80);
  });

  it("routes a loop-back onto the decision back handle, not the top inlet", () => {
    const graph = layoutGraph(
      coerceGraph({
        title: "Loop",
        nodes: [
          { id: "start", kind: "start", label: "Start" },
          { id: "d", kind: "decision", label: "Ready?" },
          { id: "fix", kind: "step", label: "Fix it" },
          { id: "go", kind: "step", label: "Continue" },
          { id: "end", kind: "end", label: "End" },
        ],
        edges: [
          { source: "start", target: "d" },
          { source: "d", target: "go", label: "yes" },
          { source: "d", target: "fix", label: "no" },
          { source: "fix", target: "d" },
          { source: "go", target: "end" },
        ],
      }),
    );
    const back = graph.edges.find((edge) => edge.source === "fix" && edge.target === "d");
    expect(back?.targetHandle).toBe("back");
    expect(back?.sourceHandle).toBe("bottom");
    const incoming = graph.edges.find((edge) => edge.source === "start" && edge.target === "d");
    expect(incoming?.targetHandle).toBe("in");
  });
});
