import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { coerceGraph } from "@/lib/graph";
import {
  PDF_MARGIN,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  planPrintPdf,
  renderPrintPdf,
} from "@/lib/print-pdf";
import { paginatePrintMap } from "@/lib/print-pages";
import { demoGraph } from "@/lib/template-graph";

function wideChain(steps: number) {
  const nodes = [
    { id: "start", kind: "start", label: "Start" },
    ...Array.from({ length: steps }, (_, index) => ({
      id: `s${index + 1}`,
      kind: "step" as const,
      label: `Step ${index + 1} inspection`,
    })),
    { id: "end", kind: "end", label: "End" },
  ];
  const ids = nodes.map((node) => node.id);
  return coerceGraph({
    title: "Wide inspection",
    nodes,
    edges: ids.slice(0, -1).map((id, index) => ({
      id: `e${index}`,
      source: id,
      target: ids[index + 1],
    })),
  });
}

describe("print pdf", () => {
  it("centers a short map on a letter landscape sheet", () => {
    const plan = planPrintPdf(demoGraph());
    expect(plan.length).toBe(paginatePrintMap(demoGraph()).length);
    expect(PDF_PAGE_WIDTH).toBe(792);
    expect(PDF_PAGE_HEIGHT).toBe(612);
    expect(PDF_MARGIN).toBeCloseTo(0.4 * 72);
    expect(plan[0].blockOffset).toBeGreaterThan(12);
    expect(plan.some((page) => page.continuations.some((stub) => stub.role === "exit"))).toBe(
      plan.length > 1,
    );
  });

  it("draws edge-arrow pages and omits Cont pills", async () => {
    const graph = wideChain(18);
    const plan = planPrintPdf(graph);
    expect(plan.length).toBeGreaterThan(1);
    expect(plan[0].continuations.some((stub) => stub.role === "exit" && stub.side === "right")).toBe(
      true,
    );
    expect(plan[1].continuations.some((stub) => stub.role === "enter" && stub.side === "left")).toBe(
      true,
    );

    const bytes = await renderPrintPdf(graph);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(plan.length);
    expect(pdf.getTitle()).toBe("Wide inspection");
    expect(pdf.getSubject()).toBe("flowchart-click-to-open");
    const first = pdf.getPage(0).getSize();
    expect(first.width).toBe(PDF_PAGE_WIDTH);
    expect(first.height).toBe(PDF_PAGE_HEIGHT);

    const source = readFileSync(path.join(process.cwd(), "lib/print-pdf.ts"), "utf8");
    expect(source).toContain("paginatePrintMap");
    expect(source).toContain("continuationDraw");
    expect(source).toContain("Page ");
    expect(source).not.toContain("cont →");
    expect(source).not.toContain("print-cont");
  });
});
