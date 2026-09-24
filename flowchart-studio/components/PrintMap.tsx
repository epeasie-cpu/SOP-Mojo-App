import type { CSSProperties } from "react";
import type { FlowGraph } from "@/lib/graph";
import { measurePrintNode, PRINT_EDGE_GUTTER, printMapBox, scalePrintGraph } from "@/lib/layout";
import { continuationDraw, printEdgePath, type ContinuationDraw } from "@/lib/print-map";
import type { PrintContinuationStub } from "@/lib/print-pages";

const ARROW = 9;

function arrowPoints(draw: ContinuationDraw): "left" | "right" {
  if (draw.role === "exit") return draw.side;
  return draw.side === "left" ? "right" : "left";
}

/** Line runs from the shape to the paper edge (exit) or from the edge into the shape (enter). */
function lineStyle(draw: ContinuationDraw): CSSProperties {
  if (draw.role === "exit" && draw.side === "right") {
    return { left: draw.nodeX, right: ARROW, top: draw.y };
  }
  if (draw.role === "exit" && draw.side === "left") {
    return { left: ARROW, width: Math.max(0, draw.nodeX - ARROW), top: draw.y };
  }
  if (draw.role === "enter" && draw.side === "left") {
    return { left: 0, width: Math.max(0, draw.nodeX - ARROW), top: draw.y };
  }
  return { left: draw.nodeX + ARROW, right: 0, top: draw.y };
}

function arrowStyle(draw: ContinuationDraw, point: "left" | "right"): CSSProperties {
  if (draw.role === "exit" && point === "right") return { right: 0, top: draw.y };
  if (draw.role === "exit" && point === "left") return { left: 0, top: draw.y };
  if (point === "right") return { left: draw.nodeX - ARROW, top: draw.y };
  return { left: draw.nodeX, top: draw.y };
}

export function PrintMap({
  graph,
  alreadyLaid = false,
  continuations = [],
  pageKey = "map",
}: {
  graph: FlowGraph;
  alreadyLaid?: boolean;
  continuations?: PrintContinuationStub[];
  pageKey?: string;
}) {
  const { graph: laid, width, height, scale } = alreadyLaid ? scalePrintGraph(graph) : printMapBox(graph);
  const innerW = Math.max(1, width / scale);
  const innerH = Math.max(1, height / scale);
  const gutterPx = (continuations.some((stub) => stub.side === "left") ? PRINT_EDGE_GUTTER : 0) * scale;
  const draws = continuations.flatMap((stub) => {
    const node = laid.nodes.find((item) => item.id === stub.nodeId);
    return node ? [continuationDraw(node, stub, gutterPx, scale)] : [];
  });

  return (
    <div className="print-map" style={{ height }} data-print-page-key={pageKey}>
      <div
        className="print-map-inner"
        style={{
          width: innerW,
          height: innerH,
          marginLeft: gutterPx,
          transform: `scale(${scale})`,
        }}
      >
        <svg
          className="print-map-edges"
          width={innerW}
          height={innerH}
          viewBox={`0 0 ${innerW} ${innerH}`}
          aria-hidden
        >
          {laid.edges.map((edge) => {
            const d = printEdgePath(laid, edge.id);
            if (!d) return null;
            return <path key={edge.id} d={d} fill="none" stroke="#18181b" strokeWidth={1.6} />;
          })}
        </svg>
        {laid.nodes.map((node) => {
          const dim = measurePrintNode(node);
          return (
            <div
              key={node.id}
              className={`print-map-node print-map-node-${node.kind}`}
              style={{
                left: node.position.x,
                top: node.position.y,
                width: dim.width,
                height: dim.height,
              }}
            >
              {node.kind === "decision" ? <span className="print-map-diamond" /> : null}
              <p className="print-map-label">{node.label}</p>
              {node.kind === "decision" ? (
                <>
                  <span className="print-map-yes">Yes</span>
                  <span className="print-map-no">No</span>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
      {draws.map((draw) => {
        const point = arrowPoints(draw);
        return (
          <div key={`${draw.role}-${draw.side}-${draw.nodeId}`} aria-hidden>
            <div
              className="print-continue-line"
              data-print-continue={`${draw.role}-${draw.side}`}
              style={lineStyle(draw)}
            />
            <div
              className={`print-continue-arrow print-continue-arrow-${point}`}
              data-print-arrow={point}
              style={arrowStyle(draw, point)}
            />
          </div>
        );
      })}
    </div>
  );
}
