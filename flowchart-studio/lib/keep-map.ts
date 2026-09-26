import type { FlowGraph } from "./graph";

export const KEEP_DISMISS_KEY = "flowchart-studio-keep-dismissed";

type Listener = () => void;
const dismissListeners = new Set<Listener>();
let dismissedMemory = false;

export function subscribeKeepDismiss(listener: Listener): () => void {
  dismissListeners.add(listener);
  return () => {
    dismissListeners.delete(listener);
  };
}

export function readKeepDismissed(): boolean {
  if (dismissedMemory) return true;
  try {
    return window.sessionStorage.getItem(KEEP_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function serverKeepDismissed(): boolean {
  return false;
}

export function dismissKeepPrompt(): void {
  dismissedMemory = true;
  try {
    window.sessionStorage.setItem(KEEP_DISMISS_KEY, "1");
  } catch {
    // The in-memory flag still dismisses this view.
  }
  for (const listener of dismissListeners) listener();
}

export function subscribeClientReady(): () => void {
  return () => {};
}

export function readClientReady(): boolean {
  return true;
}

export function serverClientReady(): boolean {
  return false;
}

const EMPTY_TITLE = "Untitled process";

/** True when the canvas is real work that currently lives only in this browser. */
export function mapNeedsAccountToKeep(graph: FlowGraph): boolean {
  if (graph.nodes.some((node) => node.kind === "step" || node.kind === "decision")) return true;
  const title = graph.title.trim();
  return title.length > 0 && title !== EMPTY_TITLE;
}
