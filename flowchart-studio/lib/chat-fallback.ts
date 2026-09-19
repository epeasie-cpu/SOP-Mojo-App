import {
  addStepAfter,
  cloneGraph,
  findNodeByRef,
  makeYesNo,
  removeNode,
  updateNodeLabel,
  type FlowGraph,
} from "./graph";
import { layoutGraph } from "./layout";
import { generateTemplateGraph } from "./template-graph";

export type ChatFallbackResult = {
  graph: FlowGraph;
  reply: string;
  applied: boolean;
};

function quotedOrRest(message: string, prefix: RegExp): string | null {
  const match = message.match(prefix);
  if (!match) return null;
  return match[1]?.trim() || null;
}

/** Local, modular edits so chat still works without an API key. */
export function applyChatFallback(graph: FlowGraph, message: string): ChatFallbackResult {
  const text = message.trim();
  if (!text) return { graph, reply: "Tell me what to change on this flowchart.", applied: false };

  const deleteMatch = text.match(/^(?:delete|remove)\s+(?:step\s+)?(.+)$/i);
  if (deleteMatch) {
    const node = findNodeByRef(graph, deleteMatch[1]);
    if (!node) return { graph, reply: `I couldn't find ${deleteMatch[1]}.`, applied: false };
    if (node.kind === "start" || node.kind === "end") {
      return { graph, reply: "Start and end stay on the canvas.", applied: false };
    }
    return {
      graph: layoutGraph(removeNode(graph, node.id)),
      reply: `Deleted “${node.label}”.`,
      applied: true,
    };
  }

  const branchMatch = text.match(
    /^(?:make)\s+(.+?)\s+(?:a\s+)?(?:yes\/no|yes or no|decision|branch)(?:\s+branch)?$/i,
  );
  if (branchMatch) {
    const node = findNodeByRef(graph, branchMatch[1]);
    if (!node) return { graph, reply: `I couldn't find ${branchMatch[1]}.`, applied: false };
    return {
      graph: layoutGraph(makeYesNo(graph, node.id)),
      reply: `“${node.label}” is now a yes/no decision.`,
      applied: true,
    };
  }

  const renameMatch = text.match(/^rename\s+(.+?)\s+to\s+(.+)$/i);
  if (renameMatch) {
    const node = findNodeByRef(graph, renameMatch[1]);
    if (!node) return { graph, reply: `I couldn't find ${renameMatch[1]}.`, applied: false };
    const label = renameMatch[2].trim().replace(/^["']|["']$/g, "");
    return {
      graph: updateNodeLabel(graph, node.id, label),
      reply: `Renamed to “${label}”.`,
      applied: true,
    };
  }

  const addMatch = quotedOrRest(
    text,
    /^(?:add|insert)\s+(?:a\s+)?step(?:\s+(?:called|named|for))?\s+(.+)$/i,
  );
  if (addMatch) {
    const lastDecisionOrStep =
      [...graph.nodes].reverse().find((node) => node.kind === "step" || node.kind === "decision") ??
      graph.nodes.find((node) => node.kind === "start");
    if (!lastDecisionOrStep) {
      return { graph, reply: "Add a start node first.", applied: false };
    }
    const next = addStepAfter(graph, lastDecisionOrStep.id, addMatch);
    return {
      graph: layoutGraph(next),
      reply: `Added “${addMatch}”.`,
      applied: true,
    };
  }

  const rewrite = /^(?:rewrite(?:\s+all)?|regenerate|rebuild)(?:\s+from\s+(?:labels|steps)?)?$/i.test(
    text,
  );
  if (rewrite) {
    const source = graph.nodes
      .filter((node) => node.kind === "step" || node.kind === "decision")
      .map((node) => node.label)
      .join("\n");
    const next = generateTemplateGraph(source || graph.title);
    return {
      graph: { ...next, title: graph.title || next.title },
      reply: "Rebuilt the flowchart from the current step labels (template mode).",
      applied: true,
    };
  }

  const titleMatch = text.match(/^(?:title|rename (?:the )?(?:process|flowchart|graph))\s+(?:to\s+)?(.+)$/i);
  if (titleMatch) {
    const title = titleMatch[1].trim().replace(/^["']|["']$/g, "");
    return {
      graph: { ...cloneGraph(graph), title },
      reply: `Title is now “${title}”.`,
      applied: true,
    };
  }

  return {
    graph,
    reply:
      "Without an AI key I can delete, rename, add a step, make a yes/no branch, or rewrite from labels. Example: “make step 2 a yes/no branch”.",
    applied: false,
  };
}
