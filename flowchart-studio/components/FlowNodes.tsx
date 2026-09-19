import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from "@xyflow/react";

export type FlowNodeData = {
  label: string;
  kind: "start" | "end" | "step" | "decision";
  onRename?: (id: string, label: string) => void;
};

export type StudioNode = Node<FlowNodeData, "start" | "end" | "step" | "decision">;

function EditableLabel({
  id,
  label,
  onRename,
  className,
}: {
  id: string;
  label: string;
  onRename?: (id: string, label: string) => void;
  className?: string;
}) {
  return (
    <input
      className={`nodrag nopan w-full bg-transparent text-center outline-none ${className ?? ""}`}
      value={label}
      aria-label="Node label"
      onChange={(event) => onRename?.(id, event.target.value)}
    />
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
      className={`min-w-[140px] rounded-full border px-4 py-2 text-sm font-semibold shadow-lg ${
        kind === "start"
          ? "border-lime bg-lime text-lime-ink"
          : "border-zinc-500 bg-zinc-800 text-zinc-100"
      } ${selected ? "ring-2 ring-lime/70" : ""}`}
    >
      {kind === "end" ? <Handle type="target" position={Position.Top} /> : null}
      <EditableLabel
        id={id}
        label={data.label}
        onRename={data.onRename}
        className={kind === "start" ? "font-semibold text-lime-ink" : "font-semibold text-zinc-100"}
      />
      {kind === "start" ? <Handle type="source" position={Position.Bottom} /> : null}
    </div>
  );
}

function StepNode({ id, data, selected }: NodeProps<StudioNode>) {
  return (
    <div
      className={`min-w-[200px] max-w-[260px] rounded-md border border-zinc-600 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 shadow-xl ${
        selected ? "ring-2 ring-lime/70" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <p className="mb-1 text-[10px] tracking-[0.16em] text-zinc-500 uppercase">Step</p>
      <EditableLabel id={id} label={data.label} onRename={data.onRename} className="text-left" />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function DecisionNode({ id, data, selected }: NodeProps<StudioNode>) {
  return (
    <div className={`relative h-36 w-36 ${selected ? "z-10" : ""}`}>
      <div
        className={`absolute inset-3 rotate-45 rounded-sm border border-lime bg-zinc-900 shadow-xl ${
          selected ? "ring-2 ring-lime/70" : ""
        }`}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="mb-1 text-[10px] tracking-[0.16em] text-lime uppercase">Decision</p>
        <EditableLabel
          id={id}
          label={data.label}
          onRename={data.onRename}
          className="text-xs font-medium text-zinc-100"
        />
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle id="yes" type="source" position={Position.Right} />
      <Handle id="no" type="source" position={Position.Bottom} />
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
