import { describe, expect, it, vi } from "vitest";
import {
  attachFlowchart,
  attachPayload,
  listBuilderSops,
  listBuilderSteps,
  OWN_STEP_ID,
  parseAttachResult,
  parseSopList,
  parseStepList,
} from "@/lib/builder-client";
import { demoGraph } from "@/lib/template-graph";

describe("builder studio attach contract", () => {
  it("posts target own for Its Own Step and the step id for an existing step", () => {
    const own = attachPayload({
      sopId: "sop_1",
      stepId: OWN_STEP_ID,
      flowchartId: "11111111-1111-4111-8111-111111111111",
      title: "Client onboarding",
      purpose: "Process with 4 mapped steps from Flowchart Studio.",
      graph: demoGraph(),
      pdfBase64: "abc",
    });
    expect(own.target).toBe("own");
    expect(own.placement).toBe("own");
    expect(own.stepId).toBeNull();
    expect(own.pdfFilename).toBe("client-onboarding-flowchart.pdf");
    expect(own.graph.title).toBe("Client onboarding");
    expect(own).not.toHaveProperty("pdfUrl");
    expect(JSON.stringify(own)).not.toContain("/api/library");
    expect(JSON.stringify(own)).not.toContain("own-step");
    expect(JSON.stringify(own)).not.toContain("itsOwnStep");

    const existing = attachPayload({
      sopId: "sop_1",
      stepId: "step_9",
      flowchartId: "11111111-1111-4111-8111-111111111111",
      title: "Client onboarding",
      purpose: "purpose",
      graph: demoGraph(),
      pdfBase64: "abc",
    });
    expect(existing.target).toBe("step_9");
    expect(existing.placement).toBe("step");
    expect(existing.stepId).toBe("step_9");
  });

  it("reads stepId, placement, pdfUrl, and the printable payload", () => {
    expect(
      parseAttachResult({
        stepId: "step_new",
        placement: "own",
        pdfUrl: "https://builder.sopmojo.com/files/map.pdf",
        printable: { view: "flowchart-click-to-open" },
      }),
    ).toEqual({
      stepId: "step_new",
      placement: "own",
      pdfUrl: "https://builder.sopmojo.com/files/map.pdf",
      printable: { view: "flowchart-click-to-open" },
    });
    expect(parseSopList({ sops: [{ id: "s", title: "Packaging" }] })).toEqual([
      { id: "s", title: "Packaging", updatedAt: undefined },
    ]);
    expect(parseStepList({ steps: [{ id: "a", number: 2, title: "Seal" }] })).toEqual([
      { id: "a", title: "Seal", number: 2 },
    ]);
  });

  it("calls Builder's /api/studio routes with the user bearer token", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/attach")) {
        return Response.json({
          stepId: "step_1",
          placement: "step",
          pdfUrl: "https://builder.sopmojo.com/files/map.pdf",
          printable: { pages: 1 },
        });
      }
      if (url.includes("/steps")) {
        return Response.json({ steps: [{ id: "step_1", title: "Inspect", number: 1 }] });
      }
      return Response.json({ sops: [{ id: "sop_1", title: "Shipping" }] });
    });

    const sops = await listBuilderSops("user-token", fetchMock);
    expect(sops[0].title).toBe("Shipping");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://builder.sopmojo.com/api/studio/sops",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer user-token" }),
      }),
    );

    const steps = await listBuilderSteps("user-token", "sop/1", fetchMock);
    expect(steps[0].id).toBe("step_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://builder.sopmojo.com/api/studio/sops/sop%2F1/steps",
      expect.anything(),
    );

    const existingBody = attachPayload({
      sopId: "sop_1",
      stepId: "step_1",
      flowchartId: "11111111-1111-4111-8111-111111111111",
      title: "Client onboarding",
      purpose: "purpose",
      graph: demoGraph(),
      pdfBase64: "abc",
    });
    const attached = await attachFlowchart("user-token", existingBody, fetchMock);
    expect(attached.placement).toBe("step");
    expect(attached.pdfUrl).toContain("map.pdf");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://builder.sopmojo.com/api/studio/attach",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(existingBody),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body)).target).toBe("step_1");

    const ownBody = attachPayload({
      sopId: "sop_1",
      stepId: OWN_STEP_ID,
      flowchartId: "11111111-1111-4111-8111-111111111111",
      title: "Client onboarding",
      purpose: "purpose",
      graph: demoGraph(),
      pdfBase64: "abc",
    });
    await attachFlowchart("user-token", ownBody, fetchMock);
    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toMatchObject({
      target: "own",
      placement: "own",
      stepId: null,
    });
  });
});
