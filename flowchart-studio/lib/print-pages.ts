import { NODE_DIMS, PRINT_MAP_MAX_WIDTH, graphBounds, layoutGraphPrint, shiftGraphToOrigin } from "./layout";
import type { FlowEdge, FlowGraph, FlowNode } from "./graph";

/** Graph-space width that fits one landscape sheet. Typical maps stay on one page. */
export const PRINT_PAGE_GRAPH_WIDTH = PRINT_MAP_MAX_WIDTH;

export type PrintPageSlice = {
  index: number;
  total: number;
  graph: FlowGraph;
  continueNext: boolean;
  continuePrev: boolean;
  backtrack: boolean;
};

function nodeRight(node: FlowNode): number {
  return node.position.x + NODE_DIMS[node.kind].width;
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
      },
    ];
  }

  const bounds = graphBounds(laid);
  if (bounds.width <= PRINT_PAGE_GRAPH_WIDTH) {
    return [
      {
        index: 0,
        total: 1,
        graph: laid,
        continueNext: false,
        continuePrev: false,
        backtrack: false,
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

  const globalY = graphBounds(laid).minY;

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

    let continueNext = false;
    let continuePrev = false;
    let backtrack = false;
    for (const edge of laid.edges) {
      const from = pageIndexFor(buckets, edge.source);
      const to = pageIndexFor(buckets, edge.target);
      if (from === index && to > index) continueNext = true;
      if (to === index && from < index) continuePrev = true;
      if (from === index && to >= 0 && to < index) backtrack = true;
    }

    return {
      index,
      total: buckets.length,
      graph: shifted,
      continueNext,
      continuePrev,
      backtrack,
    };
  });
}

export function crossingEdges(graph: FlowGraph, pageIds: Set<string>): FlowEdge[] {
  return graph.edges.filter(
    (edge) => pageIds.has(edge.source) !== pageIds.has(edge.target),
  );
}
