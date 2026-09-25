import { coerceGraph, emptyGraph, GRAPH_STORAGE_KEY, type FlowGraph } from "./graph";

type Listener = () => void;

const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribePersist(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let graphRaw: string | null = null;
let graphCache: FlowGraph = emptyGraph();

export function readGraphSnapshot(): FlowGraph {
  const raw = window.localStorage.getItem(GRAPH_STORAGE_KEY);
  if (raw === graphRaw) return graphCache;
  graphRaw = raw;
  try {
    graphCache = raw ? coerceGraph(JSON.parse(raw)) : emptyGraph();
  } catch {
    graphCache = emptyGraph();
  }
  return graphCache;
}

export function serverGraphSnapshot(): FlowGraph {
  return graphCache;
}

export function persistGraph(graph: FlowGraph) {
  const raw = JSON.stringify(graph);
  window.localStorage.setItem(GRAPH_STORAGE_KEY, raw);
  graphRaw = raw;
  graphCache = graph;
  emit();
}

