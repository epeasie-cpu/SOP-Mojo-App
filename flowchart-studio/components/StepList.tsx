"use client";

import { addStepAfter, listableNodes, removeNode, type FlowGraph, type FlowNode } from "@/lib/graph";
import { layoutGraph } from "@/lib/layout";

export function StepList({
  graph,
  onChange,
  selectedId,
  onSelect,
}: {
  graph: FlowGraph;
  onChange: (graph: FlowGraph) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const items = listableNodes(graph);

  function rename(node: FlowNode, label: string) {
    onChange({
      ...graph,
      nodes: graph.nodes.map((item) => (item.id === node.id ? { ...item, label } : item)),
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
          Steps
        </h2>
        <button
          type="button"
          className="text-xs font-semibold text-lime hover:underline"
          onClick={() => {
            const after =
              items.at(-1) ?? graph.nodes.find((node) => node.kind === "start") ?? graph.nodes[0];
            if (after) onChange(layoutGraph(addStepAfter(graph, after.id, "New step")));
          }}
        >
          Add
        </button>
      </div>
      <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed border-zinc-800 px-3 py-4 text-sm text-zinc-500">
            Paste a process, talk, or upload a scribble. The list stays in sync with the canvas.
          </li>
        ) : (
          items.map((node, index) => (
            <li
              key={node.id}
              className={`rounded-md border px-3 py-2 ${
                selectedId === node.id
                  ? "border-lime bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/60"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-[10px] tracking-[0.14em] text-zinc-500 uppercase"
                  onClick={() => onSelect?.(node.id)}
                >
                  {index + 1}. {node.kind === "decision" ? "Decision" : "Step"}
                </button>
                <button
                  type="button"
                  className="text-[11px] text-zinc-500 hover:text-red-300"
                  onClick={() => onChange(layoutGraph(removeNode(graph, node.id)))}
                >
                  Delete
                </button>
              </div>
              <textarea
                value={node.label}
                rows={3}
                onChange={(event) => rename(node, event.target.value)}
                onFocus={() => onSelect?.(node.id)}
                className="w-full resize-none bg-transparent text-sm leading-snug break-words text-zinc-100 outline-none"
                aria-label={`Step ${index + 1} label`}
              />
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
