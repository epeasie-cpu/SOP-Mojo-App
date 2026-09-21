"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { newId, type FlowGraph } from "@/lib/graph";
import { layoutGraph, NODE_DIMS } from "@/lib/layout";
import { nodeTypes, type FlowNodeData, type StudioNode } from "./FlowNodes";

import "@xyflow/react/dist/style.css";

const EDGE_PATH = { borderRadius: 16, offset: 28 } as const;

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  pathOptions: EDGE_PATH,
  style: { stroke: "#B0FF56", strokeWidth: 1.6 },
  labelStyle: { fill: "#e4e4e7", fontSize: 11, fontWeight: 600 },
  labelBgStyle: { fill: "#18181b" },
  labelBgPadding: [4, 6] as [number, number],
};

function toNodes(graph: FlowGraph, onRename: (id: string, label: string) => void): StudioNode[] {
  return graph.nodes.map((node) => {
    const dim = NODE_DIMS[node.kind];
    return {
      id: node.id,
      type: node.kind,
      position: node.position,
      width: dim.width,
      height: dim.height,
      data: { label: node.label, kind: node.kind, onRename } satisfies FlowNodeData,
    };
  });
}

function toEdges(graph: FlowGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    ...defaultEdgeOptions,
  }));
}

function graphFromRf(graph: FlowGraph, nodes: StudioNode[], edges: Edge[]): FlowGraph {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return {
    ...graph,
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: (node.type as FlowNodeData["kind"]) || byId.get(node.id)?.kind || "step",
      label: String(node.data?.label ?? byId.get(node.id)?.label ?? "Step"),
      position: node.position,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ? String(edge.label) : undefined,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
    })),
  };
}

function FlowInner({
  graph,
  onChange,
}: {
  graph: FlowGraph;
  onChange: (graph: FlowGraph) => void;
}) {
  const onRename = useCallback(
    (id: string, label: string) => {
      onChange({
        ...graph,
        nodes: graph.nodes.map((node) => (node.id === id ? { ...node, label } : node)),
      });
    },
    [graph, onChange],
  );

  const [nodes, setNodes] = useState<StudioNode[]>(() => toNodes(graph, onRename));
  const [edges, setEdges] = useState<Edge[]>(() => toEdges(graph));
  const skipSync = useRef(false);
  const { fitView, getViewport, setViewport } = useReactFlow();

  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    setNodes(toNodes(graph, onRename));
    setEdges(toEdges(graph));
  }, [graph, onRename]);

  useEffect(() => {
    let saved: { x: number; y: number; zoom: number } | null = null;
    const beforePrint = () => {
      saved = getViewport();
      fitView({ padding: 0.18 });
    };
    const afterPrint = () => {
      if (saved) setViewport(saved);
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [fitView, getViewport, setViewport]);

  const push = useCallback(
    (nextNodes: StudioNode[], nextEdges: Edge[]) => {
      skipSync.current = true;
      onChange(graphFromRf(graph, nextNodes, nextEdges));
    },
    [graph, onChange],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<StudioNode>[]) => {
      setNodes((current) => {
        const next = applyNodeChanges(changes, current);
        const structural = changes.some(
          (change) => change.type === "remove" || change.type === "add",
        );
        if (structural) push(next, edges);
        return next;
      });
    },
    [edges, push],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((current) => {
        const next = applyEdgeChanges(changes, current);
        if (changes.some((change) => change.type !== "select")) push(nodes, next);
        return next;
      });
    },
    [nodes, push],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const label =
        connection.sourceHandle === "yes" || connection.sourceHandle === "no"
          ? connection.sourceHandle
          : undefined;
      setEdges((current) => {
        const next = addEdge(
          {
            ...connection,
            id: newId("e"),
            label,
            ...defaultEdgeOptions,
          },
          current,
        );
        push(nodes, next);
        return next;
      });
    },
    [nodes, push],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={(_event, _node, nextNodes) => {
        push(nextNodes as StudioNode[], edges);
      }}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineType={ConnectionLineType.SmoothStep}
      colorMode="dark"
      fitView
      fitViewOptions={{ padding: 0.24 }}
      deleteKeyCode={["Backspace", "Delete"]}
      edgesReconnectable
      nodesConnectable
      className="bg-zinc-950"
      proOptions={{ hideAttribution: true }}
    >
      <Background className="no-print" color="#3f3f46" gap={20} />
      <Controls className="no-print" />
      <Panel position="top-right" className="no-print">
        <button
          type="button"
          className="rounded-sm border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-lime"
          onClick={() => onChange(layoutGraph(graph))}
        >
          Tidy layout
        </button>
      </Panel>
      <MiniMap
        className="no-print"
        pannable
        zoomable
        maskColor="rgba(9,9,11,0.7)"
        nodeColor={(node) =>
          node.type === "start" || node.type === "decision" ? "#B0FF56" : "#3f3f46"
        }
      />
    </ReactFlow>
  );
}

export function FlowCanvas(props: { graph: FlowGraph; onChange: (graph: FlowGraph) => void }) {
  return (
    <div className="flowchart-canvas h-full min-h-[420px] w-full">
      <ReactFlowProvider>
        <FlowInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
