import type { FlowEdge, FlowGraph, FlowNode } from "./graph";
import { listableNodes, orderedNodes, slugify } from "./graph";
import { SITE } from "./site";

import { BUILDER_BRIDGE_CONTRACT } from "./builder-bridge";

export const BUILDER_IMPORT_FORMAT = BUILDER_BRIDGE_CONTRACT.format;
export const BUILDER_IMPORT_VERSION = BUILDER_BRIDGE_CONTRACT.version;

export type BuilderDecision = {
  question: string;
  branches: Array<{ label: string; next: string }>;
};

export type BuilderStep = {
  number: number;
  title: string;
  instruction: string;
  kind: FlowNode["kind"];
  decision?: BuilderDecision;
  next?: string;
};

export type BuilderImportPackageV1 = {
  format: typeof BUILDER_IMPORT_FORMAT;
  version: 1;
  source: "flowchart-studio";
  host: string;
  generatedAt: string;
  title: string;
  purpose: string;
  steps: BuilderStep[];
  flowchart: FlowGraph;
};

export type BuilderImportPackage = Omit<BuilderImportPackageV1, "version"> & {
  version: typeof BUILDER_IMPORT_VERSION;
  print: typeof BUILDER_BRIDGE_CONTRACT.print;
  attach: {
    target: "builder-step";
    imageRole: typeof BUILDER_BRIDGE_CONTRACT.imageRole;
    imageFilename: string;
  };
  attachments?: {
    flowchartPng?: string;
  };
};

function nodeById(graph: FlowGraph): Map<string, FlowNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function edgesFrom(graph: FlowGraph, id: string): FlowEdge[] {
  return graph.edges.filter((edge) => edge.source === id);
}

function instructionFor(node: FlowNode, outgoing: FlowEdge[], byId: Map<string, FlowNode>): string {
  if (node.kind === "decision") {
    const parts = outgoing.map((edge) => {
      const target = byId.get(edge.target);
      const label = edge.label?.trim() || "then";
      return `If ${label}: go to “${target?.label ?? edge.target}”.`;
    });
    return [`Decision: ${node.label}`, ...parts].join(" ");
  }
  if (node.kind === "start") return "Begin the process.";
  if (node.kind === "end") return "Process complete.";
  return node.label;
}

function mappedSteps(graph: FlowGraph): BuilderStep[] {
  const byId = nodeById(graph);
  const ordered = orderedNodes(graph);
  return ordered.map((node, index) => {
    const outgoing = edgesFrom(graph, node.id);
    const decision =
      node.kind === "decision"
        ? {
            question: node.label,
            branches: outgoing.map((edge) => ({
              label: edge.label?.trim() || "next",
              next: byId.get(edge.target)?.label ?? edge.target,
            })),
          }
        : undefined;
    const primary = outgoing.find((edge) => {
      const label = edge.label?.toLowerCase();
      return !label || label === "yes" || label === "next";
    }) ?? outgoing[0];
    return {
      number: index + 1,
      title: node.label,
      instruction: instructionFor(node, outgoing, byId),
      kind: node.kind,
      decision,
      next: primary ? (byId.get(primary.target)?.label ?? primary.target) : undefined,
    };
  });
}

function purposeFor(graph: FlowGraph): string {
  const listed = listableNodes(graph);
  return listed.length === 0
    ? `Imported from ${SITE.name}`
    : `Process with ${listed.length} mapped step${listed.length === 1 ? "" : "s"} from ${SITE.name}.`;
}

/** v1 package Builder Pro already receives on file-drop. */
export function exportToBuilderV1(
  graph: FlowGraph,
  generatedAt = new Date().toISOString(),
): BuilderImportPackageV1 {
  return {
    format: BUILDER_IMPORT_FORMAT,
    version: 1,
    source: "flowchart-studio",
    host: SITE.host,
    generatedAt,
    title: graph.title,
    purpose: purposeFor(graph),
    steps: mappedSteps(graph),
    flowchart: graph,
  };
}

/** Map a flowchart graph onto Builder-friendly SOP steps JSON. */
export function exportToBuilder(
  graph: FlowGraph,
  generatedAt = new Date().toISOString(),
  flowchartPng?: string,
): BuilderImportPackage {
  const imageFilename = `${slugify(graph.title)}-flowchart.png`;
  return {
    ...exportToBuilderV1(graph, generatedAt),
    version: BUILDER_IMPORT_VERSION,
    print: BUILDER_BRIDGE_CONTRACT.print,
    attach: {
      target: "builder-step",
      imageRole: BUILDER_BRIDGE_CONTRACT.imageRole,
      imageFilename,
    },
    attachments: flowchartPng ? { flowchartPng } : undefined,
  };
}

export function builderPackageFilename(pkg: BuilderImportPackage): string {
  return `${slugify(pkg.title)}-builder-import.json`;
}

export function graphFilename(graph: FlowGraph): string {
  return `${slugify(graph.title)}-flowchart.json`;
}
