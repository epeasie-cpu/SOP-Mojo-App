import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { exportToBuilderV1 } from "@/lib/export-to-builder";
import {
  BUILDER_HANDOFF_ORIGIN,
  corsHeaders,
  getHandoff,
  handoffUrls,
  parseDataUrlImage,
  putHandoff,
} from "@/lib/handoff";
import { demoGraph } from "@/lib/template-graph";

describe("builder handoff", () => {
  it("stores a v1 package and returns CORS URLs", async () => {
    const pkg = exportToBuilderV1(demoGraph(), "2026-09-19T00:00:00.000Z");
    const png = parseDataUrlImage("data:image/png;base64,aaa=");
    const saved = await putHandoff({
      id: "h_test1",
      title: pkg.title,
      json: pkg,
      imageBase64: png,
    });
    const loaded = await getHandoff(saved.id);
    expect(loaded?.json).toMatchObject({ version: 1, format: "sop-builder-pro-import" });
    expect(loaded?.imageBase64).toBe("aaa=");
    expect(handoffUrls("https://flowchart.sopmojo.com", saved.id, true)).toEqual({
      jsonUrl: "https://flowchart.sopmojo.com/api/handoff/h_test1",
      imageUrl: "https://flowchart.sopmojo.com/api/handoff/h_test1/image",
    });
  });

  it("allows GET from builder.sopmojo.com", () => {
    const headers = corsHeaders(
      new Request("https://flowchart.sopmojo.com/api/handoff/x", {
        headers: { origin: "https://builder.sopmojo.com" },
      }),
    ) as Record<string, string>;
    expect(BUILDER_HANDOFF_ORIGIN).toBe("https://builder.sopmojo.com");
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://builder.sopmojo.com");
    expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
  });

  it("wires Send to publish handoff URLs instead of relying on drop", () => {
    const app = readFileSync(path.join(process.cwd(), "components/StudioApp.tsx"), "utf8");
    expect(app).toContain('fetch("/api/handoff"');
    expect(app).toContain("flowchartJson");
    expect(app).toContain("flowchartImage");
    expect(app).toContain("flowchartTitle");
    const jsonRoute = readFileSync(path.join(process.cwd(), "app/api/handoff/[id]/route.ts"), "utf8");
    expect(jsonRoute).toContain("corsHeaders");
    expect(jsonRoute).toContain("OPTIONS");
  });
});
