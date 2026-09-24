import dagre from "@dagrejs/dagre";
import {
  branchHandle,
  normalizeEdgeHandles,
  type FlowGraph,
  type FlowNode,
  type NodeKind,
} from "./graph";

export type RankDir = "TB" | "LR";

export type NodeBox = { width: number; height: number };
export type NodeSizer = (node: Pick<FlowNode, "kind" | "label">) => NodeBox;

export type LayoutOptions = {
  rankdir?: RankDir;
  compact?: boolean;
  /** Defaults to on-screen card sizes. Print passes measurePrintNode. */
  sizeOf?: NodeSizer;
  ranksep?: number;
  nodesep?: number;
};

/** On-screen canvas cards. Print uses measurePrintNode so boxes hug the label. */
export const NODE_DIMS: Record<NodeKind, NodeBox> = {
  start: { width: 168, height: 52 },
  end: { width: 168, height: 52 },
  step: { width: 248, height: 120 },
  decision: { width: 172, height: 172 },
};

/**
 * 9px semibold print type. Width is generous on purpose: print may fall back
 * to a wider system font than Geist, and a clipped label is worse than a
 * slightly looser box.
 */
const PRINT_CHAR_W = 7.2;
const PRINT_LINE_H = 12;
const PRINT_PAD_X = 8;

/** Gap between the paper edge and the first shape when a line enters or leaves that edge. */
export const PRINT_EDGE_GUTTER = 28;
export const PRINT_RANK_SEP = 16;
export const PRINT_NODE_SEP = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapPrintLines(label: string, maxChars: number, maxLines: number): string[] {
  const words = label.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (lines.length >= maxLines) break;
    const piece = word.length > maxChars ? `${word.slice(0, maxChars)}` : word;
    const next = current ? `${current} ${piece}` : piece;
    if (current && next.length > maxChars) {
      lines.push(current);
      current = piece;
      continue;
    }
    current = next;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.length ? lines.slice(0, maxLines) : [words[0].slice(0, maxChars)];
}

/** Print box that tracks the label. Much smaller than NODE_DIMS. */
export function measurePrintNode(node: Pick<FlowNode, "kind" | "label">): NodeBox {
  const label = node.label.replace(/\s+/g, " ").trim() || " ";
  if (node.kind === "start" || node.kind === "end") {
    return {
      width: clamp(Math.ceil(label.length * PRINT_CHAR_W) + 18, 58, 112),
      height: 28,
    };
  }
  if (node.kind === "decision") {
    const lines = wrapPrintLines(label, 16, 3);
    const longest = Math.max(...lines.map((line) => line.length), 1);
    const textW = longest * PRINT_CHAR_W;
    const textH = lines.length * PRINT_LINE_H;
    const box = clamp(Math.ceil(Math.max(textW + 28, textH + 28)), 84, 136);
    return { width: box, height: box };
  }
  const maxChars = Math.max(12, Math.floor((168 - PRINT_PAD_X * 2) / PRINT_CHAR_W));
  const lines = wrapPrintLines(label, maxChars, 2);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  return {
    width: clamp(Math.ceil(longest * PRINT_CHAR_W) + PRINT_PAD_X * 2 + 4, 72, 168),
    height: clamp(lines.length * PRINT_LINE_H + 10, 30, 44),
  };
}

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
function packDecisionBranchesLr(graph: FlowGraph, sizeOf: NodeSizer, gap: number): FlowGraph {
  const next = graph.nodes.map((node) => ({ ...node, position: { ...node.position } }));
  const placed = new Map(next.map((node) => [node.id, node]));

  for (const decision of next.filter((node) => node.kind === "decision")) {
    const decDim = sizeOf(decision);
    const spineY = decision.position.y + decDim.height / 2;
    for (const edge of graph.edges.filter((item) => item.source === decision.id)) {
      const child = placed.get(edge.target);
      if (!child || child.kind === "end") continue;
      const dim = sizeOf(child);
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
  const sizeOf = options.sizeOf ?? ((node: FlowNode) => NODE_DIMS[node.kind]);
  const normalized =
    rankdir === "LR" ? remapHandlesLr(normalizeEdgeHandles(graph)) : normalizeEdgeHandles(graph);
  if (normalized.nodes.length === 0) return normalized;

  const nodesep = options.nodesep ?? (compact ? NODE_SEP_LR : NODE_SEP);
  const ranksep = options.ranksep ?? (compact ? RANK_SEP_LR : RANK_SEP);
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
    const dim = sizeOf(node);
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
    const dim = sizeOf(node);
    const laidNode = g.node(node.id);
    const x = laidNode ? laidNode.x - dim.width / 2 : node.position.x;
    const y = laidNode ? laidNode.y - dim.height / 2 : node.position.y;
    ranked.set(node.id, laidNode?.y ?? y);
    return { ...node, position: { x, y } };
  });

  const packed = { ...normalized, nodes: laid };
  if (rankdir === "LR") {
    return packDecisionBranchesLr(packed, sizeOf, nodesep);
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
    const widths = row.map((node) => sizeOf(node).width);
    const total = widths.reduce((sum, w) => sum + w, 0) + nodesep * Math.max(0, row.length - 1);
    const leftmost = Math.min(...row.map((node) => node.position.x));
    const currentSpan =
      Math.max(...row.map((node) => node.position.x + sizeOf(node).width)) - leftmost;
    let x = leftmost + (currentSpan - total) / 2;
    row.forEach((node, index) => {
      const target = nodesById.get(node.id);
      if (target) target.position.x = x;
      x += widths[index] + nodesep;
    });
  }

  return packDecisionBranches(packed);
}

/** Print / wall-poster layout: left→right happy path, No branches down, tight boxes. */
export function layoutGraphPrint(graph: FlowGraph): FlowGraph {
  return layoutGraph(graph, {
    rankdir: "LR",
    compact: true,
    sizeOf: measurePrintNode,
    ranksep: PRINT_RANK_SEP,
    nodesep: PRINT_NODE_SEP,
  });
}

export function graphBounds(
  graph: FlowGraph,
  sizeOf: NodeSizer = (node) => NODE_DIMS[node.kind],
): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  if (graph.nodes.length === 0) return { minX: 0, minY: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of graph.nodes) {
    const dim = sizeOf(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + dim.width);
    maxY = Math.max(maxY, node.position.y + dim.height);
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** Shift print nodes to the origin so the map does not paginate empty space. */
export function shiftGraphToOrigin(graph: FlowGraph): FlowGraph {
  const { minX, minY } = graphBounds(graph);
  if (minX === 0 && minY === 0) return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: { x: node.position.x - minX, y: node.position.y - minY },
    })),
  };
}

/** Letter landscape minus margins / title / steps. */
export const PRINT_MAP_MAX_WIDTH = 960;
export const PRINT_MAP_MAX_HEIGHT = 500;

/** Scale an already-laid print graph to the landscape box. Does not re-layout. */
export function scalePrintGraph(graph: FlowGraph): {
  graph: FlowGraph;
  width: number;
  height: number;
  scale: number;
} {
  const shifted = shiftGraphToOrigin(graph);
  const bounds = graphBounds(shifted, measurePrintNode);
  const scale = Math.min(
    PRINT_MAP_MAX_WIDTH / Math.max(bounds.width, 1),
    PRINT_MAP_MAX_HEIGHT / Math.max(bounds.height, 1),
    1,
  );
  return {
    graph: shifted,
    width: Math.max(1, Math.round(bounds.width * scale)),
    height: Math.max(1, Math.round(bounds.height * scale)),
    scale,
  };
}

export function printMapBox(graph: FlowGraph): {
  graph: FlowGraph;
  width: number;
  height: number;
  scale: number;
} {
  return scalePrintGraph(layoutGraphPrint(graph));
}
