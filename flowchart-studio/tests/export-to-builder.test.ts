import { describe, expect, it } from "vitest";
import {
  BUILDER_IMPORT_FORMAT,
  builderPackageFilename,
  exportToBuilder,
} from "@/lib/export-to-builder";
import { demoGraph } from "@/lib/template-graph";

describe("export to builder", () => {
  it("maps decisions to Builder SOP steps JSON", () => {
    const graph = demoGraph();
    const pkg = exportToBuilder(graph, "2026-09-19T00:00:00.000Z");
    expect(pkg.format).toBe(BUILDER_IMPORT_FORMAT);
    expect(pkg.version).toBe(1);
    expect(pkg.source).toBe("flowchart-studio");
    expect(pkg.title).toBe("Client onboarding");
    expect(pkg.host).toBe("https://flowchart.sopmojo.com");
    expect(pkg.flowchart.nodes.length).toBe(graph.nodes.length);
    const decision = pkg.steps.find((step) => step.kind === "decision");
    expect(decision?.decision?.question).toMatch(/intake/i);
    expect(decision?.decision?.branches.map((b) => b.label).sort()).toEqual(["no", "yes"]);
    expect(pkg.steps.some((step) => step.kind === "step")).toBe(true);
  });

  it("names the download package from the title", () => {
    expect(builderPackageFilename(exportToBuilder(demoGraph()))).toBe(
      "client-onboarding-builder-import.json",
    );
  });
});
