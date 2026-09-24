import { describe, expect, it, vi } from "vitest";
import { demoGraph } from "@/lib/template-graph";
import {
  flowchartPurpose,
  isFlowchartMapId,
  listFlowchartMaps,
  upsertFlowchartMap,
} from "@/lib/flowchart-maps";

const MAP_ID = "11111111-1111-4111-8111-111111111111";

describe("flowchart_maps user-jwt upsert", () => {
  it("writes the Builder columns with the user token, not a service role", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        {
          id: MAP_ID,
          user_id: "22222222-2222-4222-8222-222222222222",
          title: "Client onboarding",
          purpose: flowchartPurpose(demoGraph()),
          graph: demoGraph(),
          image_url: null,
          document: { source: "flowchart-studio" },
        },
      ]),
    );

    const saved = await upsertFlowchartMap(
      {
        supabaseUrl: "https://example.supabase.co",
        anonKey: "anon-key",
        accessToken: "user-access-token",
        userId: "22222222-2222-4222-8222-222222222222",
        id: MAP_ID,
        graph: demoGraph(),
      },
      fetchMock,
    );

    expect(saved.id).toBe(MAP_ID);
    expect(saved.graph.nodes.length).toBe(demoGraph().nodes.length);
    expect(isFlowchartMapId(saved.id)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.supabase.co/rest/v1/flowchart_maps?on_conflict=id");
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer user-access-token");
    expect(headers.get("apikey")).toBe("anon-key");
    expect(headers.get("Prefer")).toContain("resolution=merge-duplicates");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.user_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(body.title).toBe("Client onboarding");
    expect(body.purpose).toMatch(/mapped step/);
    expect(body.graph).toMatchObject({ title: "Client onboarding" });
    expect(body.image_url).toBeNull();
    expect(body.document).toMatchObject({ source: "flowchart-studio" });
    expect(JSON.stringify(body)).not.toContain("service_role");
  });

  it("lists only the columns Builder stores", async () => {
    const fetchMock = vi.fn(async () => Response.json([]));
    await listFlowchartMaps(
      {
        supabaseUrl: "https://example.supabase.co/",
        anonKey: "anon-key",
        accessToken: "user-access-token",
      },
      fetchMock,
    );
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/rest/v1/flowchart_maps?select=");
    expect(decodeURIComponent(url)).toContain("title,purpose,graph,image_url,document");
  });
});
