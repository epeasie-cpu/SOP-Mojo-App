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
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*11in 8\.5in/);
    expect(css).not.toMatch(/size:\s*letter landscape/);
    expect(css).not.toMatch(/size:\s*portrait/);
    expect((css.match(/size:\s*11in 8\.5in/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(css).toContain(".no-print");
    expect(css).toContain(".react-flow__controls");
    expect(css).toContain(".react-flow__minimap");
    expect(css).toContain(".react-flow__panel");
    expect(css).toContain(".react-flow__handle");
    expect(css).toContain(".react-flow__background");
    expect(css).toContain("[role=\"dialog\"]");
    expect(css).toContain("background: white");
    expect(css).toContain(".print-steps");
    expect(css).toContain(".print-instructions");
    expect(css).toMatch(/\.print-instructions\s*\{[^}]*break-before:\s*page/);
    expect(css).not.toMatch(/\.print-steps\s*\{[^}]*break-before:\s*avoid/);
    expect(css).not.toMatch(/\.print-steps\s*\{[^}]*column-count:\s*2/);
    expect(css).toContain(".print-map");
    expect(css).toContain(".print-sheet");
    expect(css).toContain(".print-sheet.print-sheet-last");
    expect(css).toMatch(/\.print-sheet\.print-sheet-last\s*\{[^}]*break-after:\s*auto/);
    expect(css).toContain("min-height: 7.4in");
    expect(css).toContain("justify-content: center");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("page-break-inside: avoid");
    expect(css).toContain(".print-continue-line");
    expect(css).toContain(".print-continue-arrow-right");
    expect(css).toContain(".print-continue-arrow-left");
    expect(css).not.toMatch(/\.print-cont(?:\s|\{|-)/);
    expect(css).not.toContain("cont →");
    expect(css).toMatch(/\.print-map-node\s*\{[^}]*padding:\s*2px/);
    expect(css).toMatch(/\.print-map-label\s*\{[^}]*font-size:\s*9px/);
    expect(css).toMatch(/\.flowchart-canvas[\s\S]*display:\s*none/);
  });

  it("keeps capture, chat, unlock, tidy, and zoom off the printed page", () => {
    const app = readStudio("components/StudioApp.tsx");
    expect(app).toContain('className={`no-print ${');
    expect(app).toContain("print-only");
    expect(app).toContain("{graph.title}");
    expect(app).toContain("window.print()");
    expect(app.indexOf("ensurePrintPageStyle()")).toBeLessThan(app.indexOf("window.print()"));
    expect(app).toContain("print-title");
    expect(app).toContain("print-steps");
    expect(app).toContain("print-instructions");
    expect(app).toContain("data-print-instructions");
    expect(app).toContain("print-sheet");
    expect(app).toContain("paginatePrintMap");
    expect(app).toContain("printInstructions");
    expect(app).not.toContain("page.total - 1 ? (");
    const instructionSection = app.indexOf('className="print-only print-instructions');
    expect(app.indexOf("<PrintMap")).toBeLessThan(instructionSection);
    expect(instructionSection).toBeLessThan(app.indexOf('className="print-steps"'));
    expect(instructionSection).toBeLessThan(app.indexOf("<FlowCanvas"));
    expect(app).not.toContain("← backtrack");
    expect(app).not.toContain("cont →");
    expect(app).not.toContain("← cont");
    expect(app).not.toContain("print-cont");
    expect(app).toContain("data-continue-next");
    expect(app).toContain("continuations={page.continuations}");
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
    expect(canvas).not.toContain("cont →");
    expect(canvas).not.toContain("print-cont");

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
    const layout = readStudio("app/layout.tsx");
    const pageRule = readStudio("lib/print-page.ts");
    expect(layout).toContain("PRINT_PAGE_RULE");
    expect(pageRule).toContain("size: 11in 8.5in");
    expect(pageRule).not.toContain("letter landscape");
    expect(app).toContain("<InputDock");
    expect(app).toContain("<ChatPanel");
    expect(app).toContain("<StepList");
    expect(app).toContain("<UnlockModal");
  });
});
