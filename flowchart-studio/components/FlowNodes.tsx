"use client";

import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useState } from "react";
import { visibleCardText, visibleDecisionText } from "@/lib/label";

export type FlowNodeData = {
  label: string;
  kind: "start" | "end" | "step" | "decision";
  onRename?: (id: string, label: string) => void;
};

export type StudioNode = Node<FlowNodeData, "start" | "end" | "step" | "decision">;

function WrappedEditor({
  id,
  label,
  onRename,
  compact = false,
}: {
  id: string;
  label: string;
  onRename?: (id: string, label: string) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const value = editing ? draft : label;

  if (editing) {
    return (
      <textarea
        className="nodrag nopan w-full resize-none bg-transparent text-left text-sm leading-snug text-zinc-100 outline-none"
        rows={compact ? 3 : 4}
        value={value}
        aria-label="Edit node text"
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          onRename?.(id, draft.trim() || label);
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setDraft(label);
            setEditing(false);
          }
        }}
      />
    );
  }

  if (compact) {
    const shown = visibleDecisionText(label);
    return (
      <button
        type="button"
        title={label}
        className="nodrag nopan w-full text-center text-xs font-medium leading-snug text-zinc-100"
        onClick={() => {
          setDraft(label);
          setEditing(true);
        }}
      >
        <span className="block break-words whitespace-normal">
          {shown.preview}
          {shown.truncated ? "…" : ""}
        </span>
      </button>
    );
  }

  const card = visibleCardText(label);
  return (
    <button
      type="button"
      title={label}
      className="nodrag nopan w-full text-left"
      onClick={() => {
        setDraft(label);
        setEditing(true);
      }}
    >
      <span className="block text-sm font-medium leading-snug break-words whitespace-normal text-zinc-100">
        {card.title}
      </span>
      {card.body ? (
        <span className="mt-1 block text-xs leading-snug break-words whitespace-normal text-zinc-400">
          {card.body}
          {card.truncated ? "…" : ""}
        </span>
      ) : card.truncated ? (
        <span className="text-zinc-400">…</span>
      ) : null}
    </button>
  );
}

function StartEndNode({
  id,
  data,
  selected,
  kind,
}: NodeProps<StudioNode> & { kind: "start" | "end" }) {
  return (
    <div
      className={`min-w-[140px] max-w-[200px] rounded-full border px-4 py-2 text-sm font-semibold shadow-lg ${
        kind === "start"
          ? "border-lime bg-lime text-lime-ink"
          : "border-zinc-500 bg-zinc-800 text-zinc-100"
      } ${selected ? "ring-2 ring-lime/70" : ""}`}
    >
      {kind === "end" ? <Handle type="target" position={Position.Top} /> : null}
      <input
        className="nodrag nopan w-full bg-transparent text-center text-sm font-semibold outline-none"
        value={data.label}
        aria-label={`${kind} label`}
        onChange={(event) => data.onRename?.(id, event.target.value)}
      />
      {kind === "start" ? <Handle type="source" position={Position.Bottom} /> : null}
    </div>
  );
}

function StepNode({ id, data, selected }: NodeProps<StudioNode>) {
  return (
    <div
      className={`w-[248px] rounded-md border border-zinc-600 bg-zinc-900 px-3 py-3 shadow-xl ${
        selected ? "ring-2 ring-lime/70" : ""
      }`}
    >
      <Handle id="top" type="target" position={Position.Top} />
      <p className="mb-1 text-[10px] tracking-[0.16em] text-zinc-500 uppercase">Step</p>
      <WrappedEditor id={id} label={data.label} onRename={data.onRename} />
      <Handle id="bottom" type="source" position={Position.Bottom} />
    </div>
  );
}

function DecisionNode({ id, data, selected }: NodeProps<StudioNode>) {
  return (
    <div className={`relative h-[172px] w-[172px] ${selected ? "z-10" : ""}`}>
      <div
        className={`absolute inset-4 rotate-45 rounded-sm border border-lime bg-zinc-900 shadow-xl ${
          selected ? "ring-2 ring-lime/70" : ""
        }`}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <p className="mb-1 text-[10px] tracking-[0.16em] text-lime uppercase">Decision</p>
        <WrappedEditor id={id} label={data.label} onRename={data.onRename} compact />
      </div>
      <Handle id="in" type="target" position={Position.Top} />
      <Handle
        id="yes"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-lime !bg-lime"
      />
      <Handle
        id="no"
        type="source"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-zinc-400 !bg-zinc-400"
      />
      <Handle
        id="back"
        type="target"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-zinc-500 !bg-zinc-700"
      />
      <span className="pointer-events-none absolute top-1/2 right-1 -translate-y-5 text-[10px] font-semibold text-lime">
        Yes
      </span>
      <span className="pointer-events-none absolute top-1/2 left-1 -translate-y-5 text-[10px] font-semibold text-zinc-400">
        No
      </span>
    </div>
  );
}

export function StartNode(props: NodeProps<StudioNode>) {
  return <StartEndNode {...props} kind="start" />;
}

export function EndNode(props: NodeProps<StudioNode>) {
  return <StartEndNode {...props} kind="end" />;
}

export { StepNode, DecisionNode };

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  step: StepNode,
  decision: DecisionNode,
};
