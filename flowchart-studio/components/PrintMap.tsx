import type { FlowGraph } from "@/lib/graph";
import { NODE_DIMS, printMapBox } from "@/lib/layout";
import { printEdgePath } from "@/lib/print-map";

export function PrintMap({ graph }: { graph: FlowGraph }) {
  const { graph: laid, width, height, scale } = printMapBox(graph);
  const innerW = Math.max(1, width / scale);
  const innerH = Math.max(1, height / scale);

  return (
    <div className="print-map" style={{ width, height }}>
      <div
        className="print-map-inner"
        style={{
          width: innerW,
          height: innerH,
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
          const dim = NODE_DIMS[node.kind];
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
              <p className="print-map-kind">
                {node.kind === "decision" ? "Decision" : node.kind === "step" ? "Step" : node.kind}
              </p>
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
    </div>
  );
}
