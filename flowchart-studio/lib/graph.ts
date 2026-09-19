export const NODE_KINDS = ["start", "end", "step", "decision"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export type FlowPosition = { x: number; y: number };

export type FlowNode = {
  id: string;
  kind: NodeKind;
  label: string;
  position: FlowPosition;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type FlowGraph = {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const GRAPH_STORAGE_KEY = "flowchart-studio-graph";

export function isNodeKind(value: unknown): value is NodeKind {
  return NODE_KINDS.includes(value as NodeKind);
}

export function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyGraph(title = "Untitled process"): FlowGraph {
  const startId = "start";
  const endId = "end";
  return {
    title,
    nodes: [
      { id: startId, kind: "start", label: "Start", position: { x: 280, y: 24 } },
      { id: endId, kind: "end", label: "End", position: { x: 280, y: 220 } },
    ],
    edges: [{ id: "e_start_end", source: startId, target: endId }],
  };
}

export function cloneGraph(graph: FlowGraph): FlowGraph {
  return structuredClone(graph);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function coercePosition(value: unknown, fallback: FlowPosition): FlowPosition {
  const rec = asRecord(value);
  const x = Number(rec?.x);
  const y = Number(rec?.y);
  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
  };
}

export function coerceGraph(value: unknown, fallbackTitle = "Untitled process"): FlowGraph {
  const rec = asRecord(value) ?? {};
  const nodesRaw = Array.isArray(rec.nodes) ? rec.nodes : [];
  const edgesRaw = Array.isArray(rec.edges) ? rec.edges : [];
  const nodes: FlowNode[] = nodesRaw.map((item, index) => {
    const n = asRecord(item) ?? {};
    const kind = isNodeKind(n.kind)
      ? n.kind
      : isNodeKind(n.type)
        ? n.type
        : "step";
    const id = String(n.id ?? `node_${index + 1}`);
    const data = asRecord(n.data);
    const rawLabel = n.label ?? data?.label ?? (typeof n.data === "string" ? n.data : undefined);
    return {
      id,
      kind,
      label: String(rawLabel ?? `Step ${index + 1}`).trim() || `Step ${index + 1}`,
      position: coercePosition(n.position, { x: 80 + (index % 3) * 260, y: 40 + Math.floor(index / 3) * 140 }),
    };
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: FlowEdge[] = [];
  edgesRaw.forEach((item, index) => {
    const e = asRecord(item) ?? {};
    const source = String(e.source ?? "");
    const target = String(e.target ?? "");
    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) return;
    const label = e.label != null && String(e.label).trim() ? String(e.label).trim() : undefined;
    const sourceHandle =
      e.sourceHandle != null && String(e.sourceHandle).trim()
        ? String(e.sourceHandle).trim()
        : label?.toLowerCase() === "yes" || label?.toLowerCase() === "no"
          ? label.toLowerCase()
          : undefined;
    const targetHandle =
      e.targetHandle != null && String(e.targetHandle).trim()
        ? String(e.targetHandle).trim()
        : undefined;
    edges.push({
      id: String(e.id ?? `e_${source}_${target}_${index}`),
      source,
      target,
      label,
      sourceHandle,
      targetHandle,
    });
  });
  const title = String(rec.title ?? fallbackTitle).trim() || fallbackTitle;
  if (nodes.length === 0) return emptyGraph(title);
  return { title, nodes, edges };
}

export function validateGraph(graph: FlowGraph): string | null {
  if (!graph.title.trim()) return "Graph needs a title.";
  if (graph.nodes.length < 2) return "Graph needs at least two nodes.";
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    if (!node.id) return "Every node needs an id.";
    if (ids.has(node.id)) return `Duplicate node id: ${node.id}`;
    ids.add(node.id);
    if (!isNodeKind(node.kind)) return `Unknown node kind: ${node.kind}`;
    if (!node.label.trim()) return `Node ${node.id} needs a label.`;
  }
  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      return `Edge ${edge.id} points at a missing node.`;
    }
  }
  return null;
}

export function orderedNodes(graph: FlowGraph): FlowNode[] {
  const incoming = new Map<string, number>();
  for (const node of graph.nodes) incoming.set(node.id, 0);
  for (const edge of graph.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }
  const start =
    graph.nodes.find((node) => node.kind === "start") ??
    graph.nodes.find((node) => (incoming.get(node.id) ?? 0) === 0) ??
    graph.nodes[0];
  const seen = new Set<string>();
  const order: FlowNode[] = [];
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const out = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = out.get(edge.source) ?? [];
    list.push(edge.target);
    out.set(edge.source, list);
  }
  const queue = start ? [start.id] : [];
  while (queue.length) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (node) order.push(node);
    for (const next of out.get(id) ?? []) queue.push(next);
  }
  for (const node of graph.nodes) {
    if (!seen.has(node.id)) order.push(node);
  }
  return order;
}

export function listableNodes(graph: FlowGraph): FlowNode[] {
  return orderedNodes(graph).filter((node) => node.kind === "step" || node.kind === "decision");
}

export function updateNodeLabel(graph: FlowGraph, id: string, label: string): FlowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === id ? { ...node, label } : node)),
  };
}

export function updateNodeKind(graph: FlowGraph, id: string, kind: NodeKind): FlowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === id ? { ...node, kind } : node)),
  };
}

export function removeNode(graph: FlowGraph, id: string): FlowGraph {
  const node = graph.nodes.find((item) => item.id === id);
  if (!node || node.kind === "start" || node.kind === "end") return graph;
  return {
    ...graph,
    nodes: graph.nodes.filter((item) => item.id !== id),
    edges: graph.edges.filter((edge) => edge.source !== id && edge.target !== id),
  };
}

export function makeYesNo(graph: FlowGraph, id: string): FlowGraph {
  const node = graph.nodes.find((item) => item.id === id);
  if (!node || node.kind === "start" || node.kind === "end") return graph;
  let next: FlowGraph = updateNodeKind(graph, id, "decision");
  const outgoing = next.edges.filter((edge) => edge.source === id);
  const first = outgoing[0];
  if (first && first.label?.toLowerCase() !== "no") {
    next = {
      ...next,
      edges: next.edges.map((edge) =>
        edge.id === first.id ? { ...edge, label: edge.label || "yes", sourceHandle: "yes" } : edge,
      ),
    };
  }
  const hasNo = next.edges.some(
    (edge) => edge.source === id && edge.label?.toLowerCase() === "no",
  );
  if (hasNo) return next;
  const altId = newId("n");
  const end = next.nodes.find((item) => item.kind === "end");
  const alt: FlowNode = {
    id: altId,
    kind: "step",
    label: "Handle the no / exception path",
    position: { x: node.position.x + 280, y: node.position.y + 140 },
  };
  const extra: FlowEdge[] = [
    { id: newId("e"), source: id, target: altId, label: "no", sourceHandle: "no" },
  ];
  if (end) extra.push({ id: newId("e"), source: altId, target: end.id });
  return { ...next, nodes: [...next.nodes, alt], edges: [...next.edges, ...extra] };
}

export function addStepAfter(graph: FlowGraph, afterId: string, label = "New step"): FlowGraph {
  const after = graph.nodes.find((node) => node.id === afterId);
  const id = newId("n");
  const node: FlowNode = {
    id,
    kind: "step",
    label,
    position: {
      x: (after?.position.x ?? 280) + 0,
      y: (after?.position.y ?? 80) + 140,
    },
  };
  const outgoing = graph.edges.filter((edge) => edge.source === afterId);
  const rest = graph.edges.filter((edge) => edge.source !== afterId);
  const rewired: FlowEdge[] = [
    { id: newId("e"), source: afterId, target: id },
    ...outgoing.map((edge) => ({ ...edge, id: newId("e"), source: id })),
  ];
  return { ...graph, nodes: [...graph.nodes, node], edges: [...rest, ...rewired] };
}

export function graphSummary(graph: FlowGraph): string {
  const steps = listableNodes(graph);
  return steps
    .map((node, index) => {
      const mark = node.kind === "decision" ? " (decision)" : "";
      return `${index + 1}. ${node.label}${mark}`;
    })
    .join("\n");
}

export function findNodeByRef(graph: FlowGraph, ref: string): FlowNode | undefined {
  const trimmed = ref.trim();
  const numbered = trimmed.match(/^(?:step\s*)?(\d+)$/i);
  const list = listableNodes(graph);
  if (numbered) {
    const index = Number(numbered[1]) - 1;
    return list[index];
  }
  const lower = trimmed.toLowerCase();
  return (
    graph.nodes.find((node) => node.id.toLowerCase() === lower) ??
    graph.nodes.find((node) => node.label.toLowerCase() === lower) ??
    graph.nodes.find((node) => node.label.toLowerCase().includes(lower))
  );
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "flowchart"
  );
}
