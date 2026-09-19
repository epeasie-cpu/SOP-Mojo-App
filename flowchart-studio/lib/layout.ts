import dagre from "@dagrejs/dagre";
import {
  normalizeEdgeHandles,
  type FlowGraph,
  type FlowNode,
  type NodeKind,
} from "./graph";

export const NODE_DIMS: Record<NodeKind, { width: number; height: number }> = {
  start: { width: 168, height: 52 },
  end: { width: 168, height: 52 },
  step: { width: 248, height: 120 },
  decision: { width: 172, height: 172 },
};

const RANK_SEP = 110;
const NODE_SEP = 72;

function startNode(graph: FlowGraph): FlowNode | undefined {
  return (
    graph.nodes.find((node) => node.kind === "start") ??
    graph.nodes.find(
      (node) => !graph.edges.some((edge) => edge.target === node.id),
    ) ??
    graph.nodes[0]
  );
}

function branchSide(graph: FlowGraph, nodeId: string): -1 | 0 | 1 {
  const incoming = graph.edges.filter((edge) => edge.target === nodeId);
  if (incoming.some((edge) => edge.sourceHandle === "no" || edge.label?.toLowerCase() === "no")) {
    return -1;
  }
  if (incoming.some((edge) => edge.sourceHandle === "yes" || edge.label?.toLowerCase() === "yes")) {
    return 1;
  }
  return 0;
}

/** Place No children left of a decision and Yes children to the right. */
function packDecisionBranches(graph: FlowGraph): FlowGraph {
  const next = graph.nodes.map((node) => ({ ...node, position: { ...node.position } }));
  const placed = new Map(next.map((node) => [node.id, node]));

  for (const decision of next.filter((node) => node.kind === "decision")) {
    const outs = graph.edges.filter((edge) => edge.source === decision.id);
    for (const edge of outs) {
      const child = placed.get(edge.target);
      if (!child || child.kind === "end") continue;
      const dim = NODE_DIMS[child.kind];
      const decDim = NODE_DIMS.decision;
      const gap = NODE_SEP + 24;
      if (edge.sourceHandle === "no" || edge.label?.toLowerCase() === "no") {
        const maxX = decision.position.x - gap - dim.width;
        if (child.position.x > maxX) child.position.x = maxX;
      }
      if (edge.sourceHandle === "yes" || edge.label?.toLowerCase() === "yes") {
        const minX = decision.position.x + decDim.width + gap;
        if (child.position.x < minX) child.position.x = minX;
      }
    }
  }

  return { ...graph, nodes: next, edges: graph.edges };
}

/** Dagre TB layout plus a Yes-right / No-left pack so branches do not cross. */
export function layoutGraph(graph: FlowGraph): FlowGraph {
  const normalized = normalizeEdgeHandles(graph);
  if (normalized.nodes.length === 0) return normalized;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: NODE_SEP,
    ranksep: RANK_SEP,
    edgesep: 32,
    marginx: 24,
    marginy: 24,
    acyclicer: "greedy",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of normalized.nodes) {
    const dim = NODE_DIMS[node.kind];
    g.setNode(node.id, { width: dim.width, height: dim.height });
  }

  const start = startNode(normalized);
  const seen = new Set<string>();
  const queue = start ? [start.id] : [];
  const treeEdges = new Set<string>();
  while (queue.length) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const edge of normalized.edges.filter((item) => item.source === id)) {
      if (seen.has(edge.target)) continue;
      treeEdges.add(edge.id);
      queue.push(edge.target);
    }
  }

  for (const edge of normalized.edges) {
    if (!treeEdges.has(edge.id) && seen.has(edge.target)) continue;
    const weight = edge.sourceHandle === "yes" ? 2 : edge.sourceHandle === "no" ? 2 : 1;
    g.setEdge(edge.source, edge.target, { weight });
  }

  dagre.layout(g);

  const ranked = new Map<string, number>();
  const laid = normalized.nodes.map((node) => {
    const dim = NODE_DIMS[node.kind];
    const laidNode = g.node(node.id);
    const x = laidNode ? laidNode.x - dim.width / 2 : node.position.x;
    const y = laidNode ? laidNode.y - dim.height / 2 : node.position.y;
    ranked.set(node.id, laidNode?.y ?? y);
    return { ...node, position: { x, y } };
  });

  const byRank = new Map<number, FlowNode[]>();
  for (const node of laid) {
    const key = Math.round((ranked.get(node.id) ?? node.position.y) / 20);
    const list = byRank.get(key) ?? [];
    list.push(node);
    byRank.set(key, list);
  }
  const nodesById = new Map(laid.map((node) => [node.id, node]));
  for (const [, row] of byRank) {
    row.sort((a, b) => {
      const side = branchSide({ ...normalized, nodes: laid }, a.id) - branchSide({ ...normalized, nodes: laid }, b.id);
      if (side !== 0) return side;
      return a.position.x - b.position.x;
    });
    const widths = row.map((node) => NODE_DIMS[node.kind].width);
    const total = widths.reduce((sum, w) => sum + w, 0) + NODE_SEP * Math.max(0, row.length - 1);
    let x = row.reduce((min, node) => Math.min(min, node.position.x), row[0]?.position.x ?? 0);
    const leftmost = Math.min(...row.map((node) => node.position.x));
    const currentSpan =
      Math.max(...row.map((node) => node.position.x + NODE_DIMS[node.kind].width)) - leftmost;
    x = leftmost + (currentSpan - total) / 2;
    row.forEach((node, index) => {
      const target = nodesById.get(node.id);
      if (target) target.position.x = x;
      x += widths[index] + NODE_SEP;
    });
  }

  return packDecisionBranches({ ...normalized, nodes: laid });
}
