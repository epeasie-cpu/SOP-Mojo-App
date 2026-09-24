import type { FlowGraph } from "./graph";

export type LibraryMap = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  graph: FlowGraph;
  pdfUrl: string;
  url: string;
};

export type LibrarySummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  pdfUrl: string;
  url: string;
};
