import { describe, expect, it } from "vitest";
import {
  BUILDER_IMPORT_FORMAT,
  builderPackageFilename,
  exportToBuilder,
  exportToBuilderV1,
} from "@/lib/export-to-builder";
import { demoGraph } from "@/lib/template-graph";

describe("export to builder", () => {
  it("maps decisions to Builder SOP steps JSON", () => {
    const graph = demoGraph();
    const pkg = exportToBuilder(graph, "2026-09-19T00:00:00.000Z");
    expect(pkg.format).toBe(BUILDER_IMPORT_FORMAT);
    expect(pkg.version).toBe(2);
    expect(pkg.print.orientation).toBe("landscape");
    expect(pkg.print.flow).toBe("LR");
    expect(pkg.attach.target).toBe("builder-step");
    expect(pkg.attach.imageRole).toBe("builder-step-embed");
    expect(pkg.attach.imageFilename).toBe("client-onboarding-flowchart.png");
    expect(pkg.attachments).toBeUndefined();
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

  it("publishes a v1 drop package for Builder URL fetch", () => {
    const pkg = exportToBuilderV1(demoGraph(), "2026-09-19T00:00:00.000Z");
    expect(pkg.version).toBe(1);
    expect(pkg.format).toBe(BUILDER_IMPORT_FORMAT);
    expect(pkg.steps.some((step) => step.kind === "decision")).toBe(true);
    expect(pkg).not.toHaveProperty("attachments");
  });

  it("embeds an optional PNG for the Builder step image", () => {
    const pkg = exportToBuilder(demoGraph(), "2026-09-19T00:00:00.000Z", "data:image/png;base64,abc");
    expect(pkg.attachments?.flowchartPng).toBe("data:image/png;base64,abc");
  });
});
