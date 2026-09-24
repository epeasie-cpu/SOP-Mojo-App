import { beforeEach, describe, expect, it } from "vitest";
import { DELETE as deleteMap, GET as getMap, PUT as putMap } from "@/app/api/library/[id]/route";
import { GET as getPdf } from "@/app/api/library/[id]/pdf/route";
import { GET as listMaps, POST as createMap } from "@/app/api/library/route";
import { demoGraph } from "@/lib/template-graph";
import { resetLibraryMemory } from "@/lib/library-store";

const auth = { Authorization: "Bearer dev:local" };

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { ...auth, "Content-Type": "application/json", Origin: "https://builder.sopmojo.com" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("flowchart library", () => {
  beforeEach(() => {
    resetLibraryMemory();
  });

  it("saves, lists, updates, and deletes maps for one user", async () => {
    const created = await createMap(
      jsonRequest("https://flowchart.sopmojo.com/api/library", "POST", { graph: demoGraph() }),
    );
    expect(created.status).toBe(200);
    const createdBody = (await created.json()) as { map: { id: string; title: string; pdfUrl: string } };
    expect(createdBody.map.title).toBe("Client onboarding");
    expect(createdBody.map.pdfUrl).toContain(`/api/library/${createdBody.map.id}/pdf`);
    expect(created.headers.get("Access-Control-Allow-Origin")).toBe("https://builder.sopmojo.com");

    const listed = await listMaps(
      new Request("https://flowchart.sopmojo.com/api/library", { headers: auth }),
    );
    const listedBody = (await listed.json()) as { maps: Array<{ id: string; nodeCount: number }> };
    expect(listedBody.maps).toHaveLength(1);
    expect(listedBody.maps[0].nodeCount).toBe(demoGraph().nodes.length);

    const other = await listMaps(
      new Request("https://flowchart.sopmojo.com/api/library", {
        headers: { Authorization: "Bearer dev:other" },
      }),
    );
    expect(((await other.json()) as { maps: unknown[] }).maps).toHaveLength(0);

    const next = { ...demoGraph(), title: "Revised onboarding" };
    const updated = await putMap(
      jsonRequest(`https://flowchart.sopmojo.com/api/library/${createdBody.map.id}`, "PUT", {
        graph: next,
      }),
      { params: Promise.resolve({ id: createdBody.map.id }) },
    );
    expect(((await updated.json()) as { map: { title: string } }).map.title).toBe("Revised onboarding");

    const loaded = await getMap(
      new Request(`https://flowchart.sopmojo.com/api/library/${createdBody.map.id}`, { headers: auth }),
      { params: Promise.resolve({ id: createdBody.map.id }) },
    );
    expect(((await loaded.json()) as { map: { graph: { title: string } } }).map.graph.title).toBe(
      "Revised onboarding",
    );

    const pdf = await getPdf(
      new Request(`https://flowchart.sopmojo.com/api/library/${createdBody.map.id}/pdf`, {
        headers: auth,
      }),
      { params: Promise.resolve({ id: createdBody.map.id }) },
    );
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("Content-Type")).toContain("application/pdf");
    const bytes = new Uint8Array(await pdf.arrayBuffer());
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");

    const removed = await deleteMap(
      new Request(`https://flowchart.sopmojo.com/api/library/${createdBody.map.id}`, {
        method: "DELETE",
        headers: auth,
      }),
      { params: Promise.resolve({ id: createdBody.map.id }) },
    );
    expect(removed.status).toBe(204);
  });

  it("asks anonymous callers to sign in", async () => {
    const response = await listMaps(new Request("https://flowchart.sopmojo.com/api/library"));
    expect(response.status).toBe(401);
    expect(((await response.json()) as { code: string }).code).toBe("auth_required");
  });
});
