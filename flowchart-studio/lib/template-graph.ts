import { coerceGraph, emptyGraph, newId, type FlowEdge, type FlowGraph, type FlowNode } from "./graph";
import { layoutGraph } from "./layout";
import { parseProcess } from "./parse-process";

function addStep(
  nodes: FlowNode[],
  edges: FlowEdge[],
  from: string,
  label: string,
  id: string,
  branch?: "yes" | "no",
): string {
  nodes.push({ id, kind: "step", label, position: { x: 0, y: 0 } });
  edges.push({
    id: newId("e"),
    source: from,
    target: id,
    label: branch,
    sourceHandle: branch,
  });
  return id;
}

function chain(
  nodes: FlowNode[],
  edges: FlowEdge[],
  from: string,
  labels: string[],
  idPrefix: string,
  firstBranch?: "yes" | "no",
): string {
  let prev = from;
  labels.forEach((label, index) => {
    prev = addStep(nodes, edges, prev, label, `${idPrefix}${index + 1}`, index === 0 ? firstBranch : undefined);
  });
  return prev;
}

/** Deterministic flowchart when no LLM key is configured (or the model fails). */
export function generateTemplateGraph(text: string): FlowGraph {
  const parsed = parseProcess(text);
  if (!parsed.prelude.length && !parsed.decision && !parsed.epilogue.length) {
    return layoutGraph(emptyGraph());
  }

  const start: FlowNode = { id: "start", kind: "start", label: "Start", position: { x: 0, y: 0 } };
  const end: FlowNode = { id: "end", kind: "end", label: "End", position: { x: 0, y: 0 } };
  const nodes: FlowNode[] = [start];
  const edges: FlowEdge[] = [];

  const prev = chain(nodes, edges, start.id, parsed.prelude, "p_");

  if (parsed.decision) {
    const decisionId = "d1";
    nodes.push({
      id: decisionId,
      kind: "decision",
      label: parsed.decision.question,
      position: { x: 0, y: 0 },
    });
    edges.push({ id: newId("e"), source: prev, target: decisionId });

    const yesSteps = parsed.decision.yesSteps.length
      ? parsed.decision.yesSteps
      : parsed.epilogue.length
        ? parsed.epilogue
        : [];
    const noSteps = parsed.decision.noSteps.length
      ? parsed.decision.noSteps
      : ["Handle the no / exception path"];

    const yesEnd = yesSteps.length
      ? chain(nodes, edges, decisionId, yesSteps, "y_", "yes")
      : decisionId;
    const noEnd = chain(nodes, edges, decisionId, noSteps, "n_", "no");

    const after = yesSteps === parsed.epilogue ? [] : parsed.epilogue;
    if (after.length) {
      const mergeId = "m1";
      nodes.push({ id: mergeId, kind: "step", label: after[0], position: { x: 0, y: 0 } });
      if (yesEnd !== decisionId) {
        edges.push({ id: newId("e"), source: yesEnd, target: mergeId });
      } else {
        edges.push({ id: newId("e"), source: decisionId, target: mergeId, label: "yes", sourceHandle: "yes" });
      }
      edges.push({ id: newId("e"), source: noEnd, target: mergeId });
      const tail = chain(nodes, edges, mergeId, after.slice(1), "e_");
      edges.push({ id: newId("e"), source: tail, target: end.id });
    } else {
      if (yesEnd === decisionId) {
        edges.push({ id: newId("e"), source: decisionId, target: end.id, label: "yes", sourceHandle: "yes" });
      } else {
        edges.push({ id: newId("e"), source: yesEnd, target: end.id });
      }
      edges.push({ id: newId("e"), source: noEnd, target: end.id });
    }
  } else {
    const tail = chain(nodes, edges, prev, parsed.epilogue, "e_");
    edges.push({ id: newId("e"), source: tail, target: end.id });
  }

  nodes.push(end);
  return layoutGraph(coerceGraph({ title: parsed.title, nodes, edges }, parsed.title));
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
