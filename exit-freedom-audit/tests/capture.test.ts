import { describe, expect, it, vi } from "vitest";
import { handleCapture } from "@/lib/capture";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID, mailchimpSettings, mailchimpSubscriberHash } from "@/lib/mailchimp";

const ENV = {
  MAILCHIMP_API_KEY: "test-key-us21",
} as unknown as NodeJS.ProcessEnv;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("audit capture", () => {
  it("rejects a bad email and does not unlock", async () => {
    const fetchImpl = vi.fn();
    const result = await handleCapture({
      body: { email: "not-an-email", goal: "exit" },
      env: ENV,
      fetchImpl,
    });
    expect(result.status).toBe(400);
    expect(result.body.unlocked).toBeUndefined();
    expect(result.body.error).toMatch(/valid email/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a missing goal", async () => {
    const result = await handleCapture({
      body: { email: "owner@acme.com", goal: "vacation" },
      env: ENV,
    });
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
  });

  it("unlocks without calling Mailchimp when the key is unset", async () => {
    const fetchImpl = vi.fn();
    expect(mailchimpSettings({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    const result = await handleCapture({
      body: { email: " Owner@Acme.com ", goal: "family" },
      env: {} as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    });
    expect(result.status).toBe(200);
    expect(result.body.unlocked).toBe(true);
    expect(result.body.mailchimp).toEqual({
      ok: true,
      skipped: true,
      reason: "unconfigured",
      tags: ["audit", "audit_family"],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("upserts the email and applies the audit and goal tags", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const href = String(input);
      if (href.includes("/tag-search?")) return jsonResponse({ tags: [], total_items: 0 });
      if (href.endsWith("/segments")) return jsonResponse({ id: 9, name: "audit" });
      if (init?.method === "PUT") return jsonResponse({ email_address: "owner@acme.com" });
      if (href.endsWith("/tags")) return jsonResponse({});
      throw new Error(`unexpected ${init?.method} ${href}`);
    });
    const result = await handleCapture({
      body: { email: "owner@acme.com", goal: "exit" },
      env: ENV,
      fetchImpl,
    });
    expect(result.body.unlocked).toBe(true);
    expect(result.body.mailchimp).toEqual({ ok: true, tags: ["audit", "audit_exit"] });
    const put = fetchImpl.mock.calls.find((call) => call[1]?.method === "PUT");
    expect(String(put?.[0])).toContain(
      `/lists/${DEFAULT_MAILCHIMP_AUDIENCE_ID}/members/${mailchimpSubscriberHash("owner@acme.com")}`,
    );
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      email_address: "owner@acme.com",
      status_if_new: "subscribed",
    });
    const tagged = fetchImpl.mock.calls.find((call) => String(call[0]).endsWith("/tags"));
    expect(JSON.parse(String(tagged?.[1]?.body))).toEqual({
      tags: [
        { name: "audit", status: "active" },
        { name: "audit_exit", status: "active" },
      ],
    });
    const auth = new Headers(tagged?.[1]?.headers).get("authorization");
    expect(auth?.startsWith("Basic ")).toBe(true);
  });

  it("still unlocks when Mailchimp rejects the member", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/tag-search?")) return jsonResponse({ tags: [{ name: "audit" }] });
      if (init?.method === "PUT") return jsonResponse({ title: "Invalid Resource" }, 400);
      throw new Error(`unexpected ${init?.method} ${String(input)}`);
    });
    const result = await handleCapture({
      body: { email: "owner@acme.com", goal: "chaos" },
      env: ENV,
      fetchImpl,
    });
    expect(result.status).toBe(200);
    expect(result.body.unlocked).toBe(true);
    expect(result.body.mailchimp).toMatchObject({ ok: false, reason: "member" });
  });

  it("fails soft when the network throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("down");
    });
    const result = await handleCapture({
      body: { email: "owner@acme.com", goal: "absentee" },
      env: ENV,
      fetchImpl,
    });
    expect(result.body.unlocked).toBe(true);
    expect(result.body.mailchimp).toMatchObject({ ok: false, reason: "network" });
  });
});
