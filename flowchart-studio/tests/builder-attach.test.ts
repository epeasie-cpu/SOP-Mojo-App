import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as attachRoute } from "@/app/api/builder/attach/route";
import { GET as sopsRoute } from "@/app/api/builder/sops/route";
import { GET as stepsRoute } from "@/app/api/builder/sops/[sopId]/steps/route";
import {
  attachPayload,
  OWN_STEP_ID,
  parseSopList,
  parseStepList,
} from "@/lib/builder-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("builder attach contract", () => {
  it("describes own-step and existing-step placements", () => {
    const own = attachPayload({
      sopId: "sop_1",
      stepId: OWN_STEP_ID,
      flowchartId: "map_abcd",
      title: "Client onboarding",
      pdfBase64: "abc",
    });
    expect(own.placement).toBe("own-step");
    expect(own.stepId).toBeNull();
    expect(own.view).toBe("flowchart-click-to-open");
    expect(own.pdfFilename).toBe("client-onboarding-flowchart.pdf");
    expect(own.pdfUrl).toBe("https://flowchart.sopmojo.com/api/library/map_abcd/pdf");

    const existing = attachPayload({
      sopId: "sop_1",
      stepId: "step_9",
      flowchartId: "map_abcd",
      title: "Client onboarding",
      pdfBase64: "abc",
    });
    expect(existing.placement).toBe("existing-step");
    expect(existing.stepId).toBe("step_9");
  });

  it("accepts the documented SOP and step lists", () => {
    expect(parseSopList({ sops: [{ id: "s", title: "Packaging" }] })).toEqual([
      { id: "s", title: "Packaging", updatedAt: undefined },
    ]);
    expect(parseStepList({ steps: [{ id: "a", number: 2, title: "Seal" }] })).toEqual([
      { id: "a", title: "Seal", number: 2 },
    ]);
  });

  it("tells Studio when Builder has not published the SOP list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("missing", { status: 404 })),
    );
    const response = await sopsRoute(
      new Request("https://flowchart.sopmojo.com/api/builder/sops", {
        headers: { Authorization: "Bearer token" },
      }),
    );
    expect(response.status).toBe(502);
    const body = (await response.json()) as { code: string; expected: string };
    expect(body.code).toBe("builder_contract_missing");
    expect(body.expected).toBe("GET https://builder.sopmojo.com/api/flowchart-studio/sops");
  });

  it("forwards a published step list and the attach body", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ steps: [{ id: "step_1", title: "Inspect", number: 1 }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const steps = await stepsRoute(
      new Request("https://flowchart.sopmojo.com/api/builder/sops/sop_1/steps", {
        headers: { Authorization: "Bearer token" },
      }),
      { params: Promise.resolve({ sopId: "sop_1" }) },
    );
    expect(steps.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://builder.sopmojo.com/api/flowchart-studio/sops/sop_1/steps",
      expect.objectContaining({ method: "GET" }),
    );

    const attach = await attachRoute(
      new Request("https://flowchart.sopmojo.com/api/builder/attach", {
        method: "POST",
        headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ placement: "own-step" }),
      }),
    );
    expect(attach.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://builder.sopmojo.com/api/flowchart-studio/attach",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ placement: "own-step" }) }),
    );
  });
});
