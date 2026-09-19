import {
  readUnlockFromStorage,
  writeUnlockToStorage,
  type UnlockSource,
  type UnlockState,
} from "./entitlements";
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

function applyQueryUnlock() {
  const value = new URLSearchParams(window.location.search).get("unlock");
  if (value === "builder-pro" || value === "builder") {
    writeUnlockToStorage(window.localStorage, "builder-pro");
    return;
  }
  if (value === "1" || value === "true" || value === "yes" || value === "standalone") {
    writeUnlockToStorage(window.localStorage, "standalone");
  }
}

let queryApplied = false;
let graphRaw: string | null = null;
let graphCache: FlowGraph = emptyGraph();
let unlockCache: UnlockState = { unlocked: false, source: "none" };

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

export function readUnlockSnapshot(): UnlockState {
  if (!queryApplied) {
    queryApplied = true;
    applyQueryUnlock();
  }
  const next = readUnlockFromStorage(window.localStorage);
  if (unlockCache.unlocked === next.unlocked && unlockCache.source === next.source) {
    return unlockCache;
  }
  unlockCache = next;
  return unlockCache;
}

export function serverUnlockSnapshot(): UnlockState {
  return unlockCache;
}

export function persistUnlock(source: Exclude<UnlockSource, "none">): UnlockState {
  const next = writeUnlockToStorage(window.localStorage, source);
  unlockCache = next;
  emit();
  return next;
}
