import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MAILCHIMP_AUDIENCE_ID,
  captureSignedInLead,
  mailchimpSettings,
  mailchimpSubscriberHash,
  tagAudienceMember,
} from "@/lib/mailchimp";

const ENV = {
  MAILCHIMP_API_KEY: "test-key-us21",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
} as unknown as NodeJS.ProcessEnv;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("mailchimp lead tags", () => {
  it("skips when the API key is missing or has no datacenter", () => {
    expect(mailchimpSettings({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(
      mailchimpSettings({ MAILCHIMP_API_KEY: "not-a-mailchimp-key" } as unknown as NodeJS.ProcessEnv),
    ).toBeNull();
    expect(mailchimpSettings(ENV)?.audienceId).toBe(DEFAULT_MAILCHIMP_AUDIENCE_ID);
  });

  it("creates a missing flowchart tag and does not throw when Mailchimp is down", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const href = String(input);
      if (href.endsWith("/auth/v1/user")) return jsonResponse({ email: "Map@Example.com" });
      if (href.includes("/tag-search?")) return jsonResponse({ tags: [], total_items: 0 });
      if (href.endsWith("/segments")) return jsonResponse({ id: 3, name: "flowchart" });
      if (init?.method === "PUT") return jsonResponse({});
      if (href.endsWith("/tags")) return jsonResponse({});
      throw new Error(`unexpected ${init?.method} ${href}`);
    });
    await expect(
      captureSignedInLead({
        accessToken: "jwt",
        tag: "flowchart",
        env: ENV,
        fetchImpl,
      }),
    ).resolves.toEqual({ ok: true });
    const put = fetchImpl.mock.calls.find((call) => call[1]?.method === "PUT");
    expect(String(put?.[0])).toContain(mailchimpSubscriberHash("map@example.com"));
    expect(String(put?.[0])).toContain(DEFAULT_MAILCHIMP_AUDIENCE_ID);

    const down = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/auth/v1/user")) return jsonResponse({ email: "a@b.co" });
      throw new Error("down");
    });
    await expect(
      captureSignedInLead({
        accessToken: "jwt",
        tag: "flowchart",
        env: ENV,
        fetchImpl: down,
      }),
    ).resolves.toEqual({ ok: false, reason: "network" });
  });

  it("does not create a tag that already exists", async () => {
    const settings = mailchimpSettings(ENV);
    if (!settings) throw new Error("expected settings");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/tag-search?")) {
        return jsonResponse({ tags: [{ name: "flowchart" }] });
      }
      if (init?.method === "PUT") return jsonResponse({});
      if (String(input).endsWith("/tags")) return jsonResponse({});
      throw new Error(`unexpected ${String(input)}`);
    });
    await expect(
      tagAudienceMember({
        email: "map@example.com",
        tag: "flowchart",
        settings,
        fetchImpl,
      }),
    ).resolves.toEqual({ ok: true });
    expect(fetchImpl.mock.calls.some((call) => String(call[0]).endsWith("/segments"))).toBe(false);
  });
});
