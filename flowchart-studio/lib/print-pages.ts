import {
  PRINT_EDGE_GUTTER,
  PRINT_MAP_MAX_WIDTH,
  graphBounds,
  layoutGraphPrint,
  measurePrintNode,
  shiftGraphToOrigin,
} from "./layout";
import type { FlowEdge, FlowGraph, FlowNode } from "./graph";

/**
 * Graph-space width for one landscape sheet, leaving a gutter so an inbound
 * line from the paper edge does not sit under the first shape.
 */
export const PRINT_PAGE_GRAPH_WIDTH = PRINT_MAP_MAX_WIDTH - PRINT_EDGE_GUTTER;

export type PrintContinuationStub = {
  nodeId: string;
  /** Paper edge the line runs to (exit) or from (enter). */
  side: "left" | "right";
  /** exit: arrow ends on the paper edge. enter: arrow ends on the shape. */
  role: "exit" | "enter";
};

export type PrintPageSlice = {
  index: number;
  total: number;
  graph: FlowGraph;
  continueNext: boolean;
  continuePrev: boolean;
  backtrack: boolean;
  continuations: PrintContinuationStub[];
};

function nodeRight(node: FlowNode): number {
  return node.position.x + measurePrintNode(node).width;
}

function pageIndexFor(pages: FlowNode[][], id: string): number {
  return pages.findIndex((page) => page.some((node) => node.id === id));
}

/** Split an L→R print graph at connectors so a shape never straddles a page. */
export function paginatePrintMap(graph: FlowGraph): PrintPageSlice[] {
  const laid = shiftGraphToOrigin(layoutGraphPrint(graph));
  if (laid.nodes.length === 0) {
    return [
      {
        index: 0,
        total: 1,
        graph: laid,
        continueNext: false,
        continuePrev: false,
        backtrack: false,
        continuations: [],
      },
    ];
  }

  const bounds = graphBounds(laid, measurePrintNode);
  if (bounds.width <= PRINT_PAGE_GRAPH_WIDTH) {
    return [
      {
        index: 0,
        total: 1,
        graph: laid,
        continueNext: false,
        continuePrev: false,
        backtrack: false,
        continuations: [],
      },
    ];
  }

  const sorted = [...laid.nodes].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  const buckets: FlowNode[][] = [];
  let current: FlowNode[] = [];
  let originX = sorted[0].position.x;

  for (const node of sorted) {
    const right = nodeRight(node);
    if (current.length > 0 && right - originX > PRINT_PAGE_GRAPH_WIDTH) {
      buckets.push(current);
      current = [node];
      originX = node.position.x;
    } else {
      if (current.length === 0) originX = node.position.x;
      current.push(node);
    }
  }
  if (current.length) buckets.push(current);

  const globalY = graphBounds(laid, measurePrintNode).minY;

  return buckets.map((pageNodes, index) => {
    const ids = new Set(pageNodes.map((node) => node.id));
    const minX = Math.min(...pageNodes.map((node) => node.position.x));
    const shifted: FlowGraph = {
      ...laid,
      nodes: pageNodes.map((node) => ({
        ...node,
        position: { x: node.position.x - minX, y: node.position.y - globalY },
      })),
      edges: laid.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
    };

    const continuations: PrintContinuationStub[] = [];
    const seen = new Set<string>();
    const add = (stub: PrintContinuationStub) => {
      const key = `${stub.role}:${stub.side}:${stub.nodeId}`;
      if (seen.has(key)) return;
      seen.add(key);
      continuations.push(stub);
    };

    for (const edge of laid.edges) {
      const from = pageIndexFor(buckets, edge.source);
      const to = pageIndexFor(buckets, edge.target);
      if (from < 0 || to < 0 || from === to) continue;
      if (to > from) {
        if (from === index) add({ nodeId: edge.source, side: "right", role: "exit" });
        if (to === index) add({ nodeId: edge.target, side: "left", role: "enter" });
      } else {
        if (from === index) add({ nodeId: edge.source, side: "left", role: "exit" });
        if (to === index) add({ nodeId: edge.target, side: "right", role: "enter" });
      }
    }

    return {
      index,
      total: buckets.length,
      graph: shifted,
      continueNext: continuations.some((stub) => stub.role === "exit" && stub.side === "right"),
      continuePrev: continuations.some((stub) => stub.role === "enter" && stub.side === "left"),
      backtrack: continuations.some((stub) => stub.role === "exit" && stub.side === "left"),
      continuations,
    };
  });
}

export function crossingEdges(graph: FlowGraph, pageIds: Set<string>): FlowEdge[] {
  return graph.edges.filter(
    (edge) => pageIds.has(edge.source) !== pageIds.has(edge.target),
  );
}
