import { coerceGraph, emptyGraph, newId, type FlowEdge, type FlowGraph, type FlowNode } from "./graph";
import { layoutGraph } from "./layout";

const DECISION_RE = /\b(if|whether|decision|approve|yes\/no|yes or no)\b|\?\s*$/i;

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*]|\d+[.)])\s+/, "")
        .replace(/^step\s+\d+[:.\-]\s*/i, "")
        .trim(),
    )
    .filter(Boolean);
}

function titleFrom(text: string, lines: string[]): string {
  const first = lines[0] ?? "";
  if (first.length > 0 && first.length <= 80 && !DECISION_RE.test(first)) {
    const maybeTitle = text.split(/\r?\n/)[0]?.trim() ?? "";
    if (maybeTitle && !/^\d+[.)]/.test(maybeTitle) && maybeTitle.length <= 80) {
      return maybeTitle.replace(/:$/, "");
    }
  }
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned || "Untitled process";
  const slice = cleaned.slice(0, 60);
  const at = slice.lastIndexOf(" ");
  const clipped = (at > 24 ? slice.slice(0, at) : slice).trimEnd();
  return `${clipped}…`;
}

/** Deterministic flowchart when no LLM key is configured (or the model fails). */
export function generateTemplateGraph(text: string): FlowGraph {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return layoutGraph(emptyGraph());
  const lines = splitLines(text);
  const body = lines.length ? lines : [cleaned];
  const title = titleFrom(text, body);
  const steps = body[0] === title && body.length > 1 ? body.slice(1) : body;

  const start: FlowNode = { id: "start", kind: "start", label: "Start", position: { x: 0, y: 0 } };
  const end: FlowNode = { id: "end", kind: "end", label: "End", position: { x: 0, y: 0 } };
  const nodes: FlowNode[] = [start];
  const edges: FlowEdge[] = [];
  let prev = start.id;

  steps.forEach((line, index) => {
    const isDecision = DECISION_RE.test(line);
    const id = `n${index + 1}`;
    nodes.push({
      id,
      kind: isDecision ? "decision" : "step",
      label: line.replace(/\?$/, "").trim() || `Step ${index + 1}`,
      position: { x: 0, y: 0 },
    });
    const label = nodes[nodes.length - 2]?.kind === "decision" ? "yes" : undefined;
    edges.push({
      id: newId("e"),
      source: prev,
      target: id,
      label,
      sourceHandle: label,
    });
    if (isDecision) {
      const altId = `${id}_no`;
      nodes.push({
        id: altId,
        kind: "step",
        label: "Handle the no / exception path",
        position: { x: 0, y: 0 },
      });
      edges.push({
        id: newId("e"),
        source: id,
        target: altId,
        label: "no",
        sourceHandle: "no",
      });
      edges.push({ id: newId("e"), source: altId, target: "end" });
    }
    prev = id;
  });

  edges.push({ id: newId("e"), source: prev, target: end.id });
  nodes.push(end);
  return layoutGraph(coerceGraph({ title, nodes, edges }, title));
}

export function demoGraph(): FlowGraph {
  return layoutGraph(
    coerceGraph({
      title: "Client onboarding",
      nodes: [
        { id: "start", kind: "start", label: "Start" },
        { id: "n1", kind: "step", label: "Capture the new client request" },
        { id: "n2", kind: "decision", label: "Is intake complete?" },
        { id: "n3", kind: "step", label: "Ask for missing documents" },
        { id: "n4", kind: "step", label: "Create the workspace and kickoff SOP" },
        { id: "n5", kind: "step", label: "Send welcome pack" },
        { id: "end", kind: "end", label: "End" },
      ],
      edges: [
        { id: "e1", source: "start", target: "n1" },
        { id: "e2", source: "n1", target: "n2" },
        { id: "e3", source: "n2", target: "n4", label: "yes", sourceHandle: "yes" },
        { id: "e4", source: "n2", target: "n3", label: "no", sourceHandle: "no" },
        { id: "e5", source: "n3", target: "n2" },
        { id: "e6", source: "n4", target: "n5" },
        { id: "e7", source: "n5", target: "end" },
      ],
    }),
  );
}
