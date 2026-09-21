import dagre from "@dagrejs/dagre";
import {
  branchHandle,
  normalizeEdgeHandles,
  type FlowGraph,
  type FlowNode,
  type NodeKind,
} from "./graph";

export type RankDir = "TB" | "LR";

export type LayoutOptions = {
  rankdir?: RankDir;
  compact?: boolean;
};

export const NODE_DIMS: Record<NodeKind, { width: number; height: number }> = {
  start: { width: 168, height: 52 },
  end: { width: 168, height: 52 },
  step: { width: 248, height: 120 },
  decision: { width: 172, height: 172 },
};

const RANK_SEP = 110;
const NODE_SEP = 72;
const RANK_SEP_LR = 56;
const NODE_SEP_LR = 40;

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

function isNoEdge(edge: { sourceHandle?: string; label?: string }): boolean {
  return edge.sourceHandle === "no" || edge.sourceHandle === "no-down" || branchHandle(edge.label) === "no";
}

function isYesEdge(edge: { sourceHandle?: string; label?: string }): boolean {
  return edge.sourceHandle === "yes" || branchHandle(edge.label) === "yes";
}

/** Left→right print: Yes stays on the rightward spine; No drops below. */
function remapHandlesLr(graph: FlowGraph): FlowGraph {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const edges = graph.edges.map((edge) => {
    const next = { ...edge };
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return next;

    const loopsBackToDecision =
      target.kind === "decision" &&
      graph.edges.some((other) => other.source === target.id && other.target === source.id);

    if (source.kind === "decision") {
      if (isNoEdge(next)) {
        next.label = "no";
        next.sourceHandle = "no-down";
        next.targetHandle = target.kind === "end" ? "left" : "top";
      } else {
        next.label = next.label ?? "yes";
        next.sourceHandle = "yes";
        next.targetHandle = target.kind === "end" ? "left" : target.kind === "decision" ? "in-left" : "left";
      }
      return next;
    }

    if (loopsBackToDecision) {
      next.sourceHandle = source.kind === "start" ? "right" : "right";
      next.targetHandle = "in";
      return next;
    }

    next.sourceHandle = source.kind === "start" ? "right" : "right";
    next.targetHandle =
      target.kind === "end" ? "left" : target.kind === "decision" ? "in-left" : "left";
    return next;
  });
  return { ...graph, edges };
}

/** Place No children below a decision and Yes children on the rightward spine. */
function packDecisionBranchesLr(graph: FlowGraph): FlowGraph {
  const next = graph.nodes.map((node) => ({ ...node, position: { ...node.position } }));
  const placed = new Map(next.map((node) => [node.id, node]));
  const gap = NODE_SEP_LR;

  for (const decision of next.filter((node) => node.kind === "decision")) {
    const decDim = NODE_DIMS.decision;
    const spineY = decision.position.y + decDim.height / 2;
    for (const edge of graph.edges.filter((item) => item.source === decision.id)) {
      const child = placed.get(edge.target);
      if (!child || child.kind === "end") continue;
      const dim = NODE_DIMS[child.kind];
      if (isNoEdge(edge)) {
        const minY = decision.position.y + decDim.height + gap;
        if (child.position.y < minY) child.position.y = minY;
      }
      if (isYesEdge(edge)) {
        const minX = decision.position.x + decDim.width + gap;
        if (child.position.x < minX) child.position.x = minX;
        child.position.y = spineY - dim.height / 2;
      }
    }
  }

  return { ...graph, nodes: next, edges: graph.edges };
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

/** Dagre layout. Screen default is top-down; print uses left→right compact. */
export function layoutGraph(graph: FlowGraph, options: LayoutOptions = {}): FlowGraph {
  const rankdir: RankDir = options.rankdir ?? "TB";
  const compact = options.compact ?? rankdir === "LR";
  const normalized =
    rankdir === "LR" ? remapHandlesLr(normalizeEdgeHandles(graph)) : normalizeEdgeHandles(graph);
  if (normalized.nodes.length === 0) return normalized;

  const nodesep = compact ? NODE_SEP_LR : NODE_SEP;
  const ranksep = compact ? RANK_SEP_LR : RANK_SEP;
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir,
    nodesep,
    ranksep,
    edgesep: compact ? 18 : 32,
    marginx: compact ? 12 : 24,
    marginy: compact ? 12 : 24,
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
    const weight =
      edge.sourceHandle === "yes" ? 4 : edge.sourceHandle === "no" || edge.sourceHandle === "no-down" ? 1 : 2;
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

  const packed = { ...normalized, nodes: laid };
  if (rankdir === "LR") {
    return packDecisionBranchesLr(packed);
  }

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
    const leftmost = Math.min(...row.map((node) => node.position.x));
    const currentSpan =
      Math.max(...row.map((node) => node.position.x + NODE_DIMS[node.kind].width)) - leftmost;
    let x = leftmost + (currentSpan - total) / 2;
    row.forEach((node, index) => {
      const target = nodesById.get(node.id);
      if (target) target.position.x = x;
      x += widths[index] + NODE_SEP;
    });
  }

  return packDecisionBranches(packed);
}

/** Print / wall-poster layout: left→right happy path, No branches down. */
export function layoutGraphPrint(graph: FlowGraph): FlowGraph {
  return layoutGraph(graph, { rankdir: "LR", compact: true });
}

export function graphBounds(graph: FlowGraph): { width: number; height: number } {
  if (graph.nodes.length === 0) return { width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of graph.nodes) {
    const dim = NODE_DIMS[node.kind];
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + dim.width);
    maxY = Math.max(maxY, node.position.y + dim.height);
  }
  return { width: maxX - minX, height: maxY - minY };
}
