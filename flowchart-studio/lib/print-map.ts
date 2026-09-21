import type { FlowGraph, FlowNode } from "./graph";
import { NODE_DIMS } from "./layout";

type Point = { x: number; y: number };

function box(node: FlowNode) {
  const dim = NODE_DIMS[node.kind];
  return { x: node.position.x, y: node.position.y, w: dim.width, h: dim.height };
}

export function port(
  node: FlowNode,
  side: "left" | "right" | "top" | "bottom",
): Point {
  const b = box(node);
  if (side === "right") return { x: b.x + b.w, y: b.y + b.h / 2 };
  if (side === "left") return { x: b.x, y: b.y + b.h / 2 };
  if (side === "top") return { x: b.x + b.w / 2, y: b.y };
  return { x: b.x + b.w / 2, y: b.y + b.h };
}

export function printEdgePath(graph: FlowGraph, edgeId: string): string | null {
  const edge = graph.edges.find((item) => item.id === edgeId);
  if (!edge) return null;
  const source = graph.nodes.find((node) => node.id === edge.source);
  const target = graph.nodes.find((node) => node.id === edge.target);
  if (!source || !target) return null;

  const noDown = edge.sourceHandle === "no-down" || edge.sourceHandle === "no";
  const from = noDown ? port(source, "bottom") : port(source, "right");
  const toTop = edge.targetHandle === "top" || edge.targetHandle === "in";
  const to = toTop ? port(target, "top") : port(target, "left");
  const radius = 12;

  if (Math.abs(from.y - to.y) < 6) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
  if (noDown) {
    const midY = from.y + Math.max(18, (to.y - from.y) / 2);
    return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
  }
  const midX = from.x + Math.max(radius, (to.x - from.x) / 2);
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}
