import { describe, expect, it } from "vitest";
import { coerceGraph } from "@/lib/graph";
import { graphBounds, layoutGraph, layoutGraphPrint } from "@/lib/layout";
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

  it("prints left-to-right with Yes on the spine and No below", () => {
    const screen = demoGraph();
    const printed = layoutGraphPrint(screen);
    const start = printed.nodes.find((node) => node.kind === "start");
    const end = printed.nodes.find((node) => node.kind === "end");
    const decision = printed.nodes.find((node) => node.kind === "decision");
    if (!start || !end || !decision) throw new Error("expected start/end/decision");
    expect(start.position.x).toBeLessThan(decision.position.x);
    expect(decision.position.x).toBeLessThan(end.position.x);

    const yes = printed.edges.find((edge) => edge.source === decision.id && edge.label === "yes");
    const no = printed.edges.find((edge) => edge.source === decision.id && edge.label === "no");
    expect(yes?.sourceHandle).toBe("yes");
    expect(no?.sourceHandle).toBe("no-down");
    const yesNode = printed.nodes.find((node) => node.id === yes?.target);
    const noNode = printed.nodes.find((node) => node.id === no?.target);
    if (!yesNode || !noNode) throw new Error("expected yes/no children");
    expect(yesNode.position.x).toBeGreaterThan(decision.position.x + 40);
    expect(noNode.position.y).toBeGreaterThan(decision.position.y + 40);

    const tb = graphBounds(screen);
    const lr = graphBounds(printed);
    expect(lr.width).toBeGreaterThan(lr.height);
    expect(lr.height).toBeLessThan(tb.height);
  });

  it("packs a short car-wash style map into a landscape page box", () => {
    const printed = layoutGraphPrint(
      coerceGraph({
        title: "Car wash",
        nodes: [
          { id: "start", kind: "start", label: "Start" },
          { id: "s1", kind: "step", label: "Rinse the exterior" },
          { id: "s2", kind: "step", label: "Apply automotive soap" },
          { id: "s3", kind: "step", label: "Wash roof to wheels" },
          { id: "s4", kind: "step", label: "Rinse soap residue" },
          { id: "d1", kind: "decision", label: "Can the car air dry?" },
          { id: "s5", kind: "step", label: "Hand dry with a microfiber" },
          { id: "s6", kind: "step", label: "Put cleaning supplies away" },
          { id: "end", kind: "end", label: "End" },
        ],
        edges: [
          { source: "start", target: "s1" },
          { source: "s1", target: "s2" },
          { source: "s2", target: "s3" },
          { source: "s3", target: "s4" },
          { source: "s4", target: "d1" },
          { source: "d1", target: "s6", label: "yes" },
          { source: "d1", target: "s5", label: "no" },
          { source: "s5", target: "s6" },
          { source: "s6", target: "end" },
        ],
      }),
    );
    const bounds = graphBounds(printed);
    expect(bounds.width).toBeGreaterThan(bounds.height);
    // Landscape letter minus margins is ~980x740 CSS px; compact LR should scale into one page.
    expect(bounds.height).toBeLessThan(740);
    const start = printed.nodes.find((node) => node.kind === "start");
    const end = printed.nodes.find((node) => node.kind === "end");
    if (!start || !end) throw new Error("expected start/end");
    expect(end.position.x).toBeGreaterThan(start.position.x + 400);
  });
});
