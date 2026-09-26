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
    expect(mailchimpSettings({ ...ENV, MAILCHIMP_AUDIENCE_ID: "abc123" })?.audienceId).toBe("abc123");
  });

  it("does not call Mailchimp when the key is unset", async () => {
    const fetchImpl = vi.fn();
    await expect(
      captureSignedInLead({
        accessToken: "jwt",
        tag: "writer",
        env: {} as unknown as NodeJS.ProcessEnv,
        fetchImpl,
      }),
    ).resolves.toEqual({ ok: true, skipped: true, reason: "unconfigured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("skips tagging when the Supabase token does not resolve to an email", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("/auth/v1/user");
      return jsonResponse({ message: "bad" }, 401);
    });
    await expect(
      captureSignedInLead({
        accessToken: "jwt",
        tag: "writer",
        env: ENV,
        fetchImpl,
      }),
    ).resolves.toEqual({ ok: true, skipped: true, reason: "no-email" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toBe("https://example.supabase.co/auth/v1/user");
  });

  it("creates a missing tag, subscribes a new contact, and applies the tag", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const href = String(input);
      if (href.endsWith("/auth/v1/user")) return jsonResponse({ email: "Lead@Example.com" });
      if (href.includes("/tag-search?")) return jsonResponse({ tags: [], total_items: 0 });
      if (href.endsWith("/segments")) return jsonResponse({ id: 9, name: "writer" });
      if (init?.method === "PUT") return jsonResponse({ email_address: "lead@example.com" });
      if (href.endsWith("/tags")) return jsonResponse({});
      throw new Error(`unexpected ${init?.method} ${href}`);
    });

    await expect(
      captureSignedInLead({
        accessToken: "jwt",
        tag: "writer",
        env: ENV,
        fetchImpl,
      }),
    ).resolves.toEqual({ ok: true });

    const urls = fetchImpl.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes(`/lists/${DEFAULT_MAILCHIMP_AUDIENCE_ID}/segments`))).toBe(
      true,
    );
    const put = fetchImpl.mock.calls.find((call) => call[1]?.method === "PUT");
    expect(String(put?.[0])).toContain(
      `/lists/${DEFAULT_MAILCHIMP_AUDIENCE_ID}/members/${mailchimpSubscriberHash("lead@example.com")}`,
    );
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      email_address: "lead@example.com",
      status_if_new: "subscribed",
    });
    const tagged = fetchImpl.mock.calls.find((call) => String(call[0]).endsWith("/tags"));
    expect(JSON.parse(String(tagged?.[1]?.body))).toEqual({
      tags: [{ name: "writer", status: "active" }],
    });
    const auth = new Headers(tagged?.[1]?.headers).get("authorization");
    expect(auth?.startsWith("Basic ")).toBe(true);
  });

  it("does not create a tag that already exists", async () => {
    const settings = mailchimpSettings(ENV);
    if (!settings) throw new Error("expected settings");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const href = String(input);
      if (href.includes("/tag-search?")) return jsonResponse({ tags: [{ id: 1, name: "flowchart" }] });
      if (init?.method === "PUT") return jsonResponse({});
      if (href.endsWith("/tags")) return jsonResponse({});
      throw new Error(`unexpected ${init?.method} ${href}`);
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

  it("fails soft when Mailchimp rejects the member upsert", async () => {
    const settings = mailchimpSettings(ENV);
    if (!settings) throw new Error("expected settings");
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/tag-search?")) return jsonResponse({ tags: [{ name: "writer" }] });
      if (init?.method === "PUT") return jsonResponse({ title: "Invalid Resource" }, 400);
      throw new Error(`unexpected ${init?.method} ${String(input)}`);
    });
    await expect(
      tagAudienceMember({
        email: "lead@example.com",
        tag: "writer",
        settings,
        fetchImpl,
      }),
    ).resolves.toEqual({ ok: false, reason: "member" });
  });

  it("fails soft when the network throws", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/auth/v1/user")) return jsonResponse({ email: "a@b.co" });
      throw new Error("down");
    });
    await expect(
      captureSignedInLead({
        accessToken: "jwt",
        tag: "flowchart",
        env: ENV,
        fetchImpl,
      }),
    ).resolves.toEqual({ ok: false, reason: "network" });
  });
});
