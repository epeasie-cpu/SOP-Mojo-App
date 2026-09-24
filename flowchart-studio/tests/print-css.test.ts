import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readStudio(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("print stylesheet", () => {
  it("hides studio chrome and React Flow widgets only in @media print", () => {
    const css = readStudio("app/globals.css");
    expect(css).toContain("@media print");
    expect(css.indexOf("@page")).toBeLessThan(css.indexOf("@media print"));
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*letter landscape/);
    expect(css).not.toMatch(/size:\s*portrait/);
    expect(css).toContain(".no-print");
    expect(css).toContain(".react-flow__controls");
    expect(css).toContain(".react-flow__minimap");
    expect(css).toContain(".react-flow__panel");
    expect(css).toContain(".react-flow__handle");
    expect(css).toContain(".react-flow__background");
    expect(css).toContain("[role=\"dialog\"]");
    expect(css).toContain("background: white");
    expect(css).toContain(".print-steps");
    expect(css).toContain(".print-map");
    expect(css).toContain(".print-sheet");
    expect(css).toContain(".print-sheet-last");
    expect(css).toContain("min-height: 7.4in");
    expect(css).toContain("justify-content: center");
    expect(css).toContain("page-break-inside: avoid");
    expect(css).toContain(".print-cont");
    expect(css).toMatch(/\.flowchart-canvas[\s\S]*display:\s*none/);
  });

  it("keeps capture, chat, unlock, tidy, and zoom off the printed page", () => {
    const app = readStudio("components/StudioApp.tsx");
    expect(app).toContain('className={`no-print ${');
    expect(app).toContain("print-only");
    expect(app).toContain("{graph.title}");
    expect(app).toContain("window.print()");
    expect(app).toContain("print-title");
    expect(app).toContain("print-steps");
    expect(app).toContain("print-sheet");
    expect(app).toContain("paginatePrintMap");
    expect(app).toContain("listableNodes");
    expect(app).toContain("← backtrack");
    expect(app).toContain("<PrintMap");
    expect(app).toContain("studio-workspace no-print");
    expect(app.indexOf("print-title")).toBeLessThan(app.indexOf("<PrintMap"));
    expect(app.indexOf("<PrintMap")).toBeLessThan(app.indexOf("<FlowCanvas"));

    const canvas = readStudio("components/FlowCanvas.tsx");
    expect(canvas).toContain("<Controls className=\"no-print\"");
    expect(canvas).toContain("<MiniMap");
    expect(canvas).toContain('className="no-print"');
    expect(canvas).toContain("Tidy layout");
    expect(canvas).toContain("beforeprint");
    expect(canvas).toContain("fitView");
    expect(canvas).toContain("layoutGraphPrint");
    expect(canvas).toContain("cont →");

    const unlock = readStudio("components/UnlockModal.tsx");
    expect(unlock).toMatch(/UnlockHint[\s\S]*no-print|no-print[\s\S]*UnlockHint/);
    expect(unlock).toContain("no-print fixed inset-0");
    expect(unlock).toContain("no-print flex items-center justify-between");

    const nodes = readStudio("components/FlowNodes.tsx");
    expect(nodes).toContain("print:hidden");
    expect(nodes).toContain("print-label");
    expect(nodes).toContain("print:block");
    expect(nodes).toContain("flowchart-node");
    expect(nodes).toContain("flowchart-diamond");
  });

  it("does not remove screen chrome from the live studio GUI", () => {
    const canvas = readStudio("components/FlowCanvas.tsx");
    expect(canvas).toContain("<Controls");
    expect(canvas).toContain("<MiniMap");
    expect(canvas).toContain("Tidy layout");

    const app = readStudio("components/StudioApp.tsx");
    expect(app).toContain("<InputDock");
    expect(app).toContain("<ChatPanel");
    expect(app).toContain("<StepList");
    expect(app).toContain("<UnlockModal");
  });
});
