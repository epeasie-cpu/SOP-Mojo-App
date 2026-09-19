import type { FlowGraph, FlowNode } from "./graph";

const COL_W = 280;
const ROW_H = 150;
const ORIGIN_X = 80;
const ORIGIN_Y = 40;

function outgoing(graph: FlowGraph): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = map.get(edge.source) ?? [];
    list.push(edge.target);
    map.set(edge.source, list);
  }
  return map;
}

function startNode(graph: FlowGraph): FlowNode | undefined {
  return (
    graph.nodes.find((node) => node.kind === "start") ??
    graph.nodes.find(
      (node) => !graph.edges.some((edge) => edge.target === node.id),
    ) ??
    graph.nodes[0]
  );
}

/** Layered top-to-bottom layout so AI output is immediately editable. */
export function layoutGraph(graph: FlowGraph): FlowGraph {
  if (graph.nodes.length === 0) return graph;
  const start = startNode(graph);
  const out = outgoing(graph);
  const level = new Map<string, number>();
  const queue: string[] = [];
  if (start) {
    level.set(start.id, 0);
    queue.push(start.id);
  }
  while (queue.length) {
    const id = queue.shift() as string;
    const nextLevel = (level.get(id) ?? 0) + 1;
    for (const next of out.get(id) ?? []) {
      const existing = level.get(next);
      // First visit only — cycles (decision loops) must not raise levels forever.
      if (existing == null) {
        level.set(next, nextLevel);
        queue.push(next);
      }
    }
  }
  let extra = (Math.max(0, ...level.values()) || 0) + 1;
  for (const node of graph.nodes) {
    if (!level.has(node.id)) {
      level.set(node.id, extra);
      extra += 1;
    }
  }
  const buckets = new Map<number, FlowNode[]>();
  for (const node of graph.nodes) {
    const l = level.get(node.id) ?? 0;
    const list = buckets.get(l) ?? [];
    list.push(node);
    buckets.set(l, list);
  }
  const positioned = graph.nodes.map((node) => {
    const l = level.get(node.id) ?? 0;
    const row = buckets.get(l) ?? [node];
    const index = row.findIndex((item) => item.id === node.id);
    const count = row.length;
    const rowWidth = (count - 1) * COL_W;
    const x = ORIGIN_X + 280 - rowWidth / 2 + index * COL_W;
    const y = ORIGIN_Y + l * ROW_H;
    return { ...node, position: { x, y } };
  });
  return { ...graph, nodes: positioned };
}
