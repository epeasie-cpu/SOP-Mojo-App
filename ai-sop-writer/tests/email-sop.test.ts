import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EMAIL_FROM,
  EMAIL_SEND_ERROR,
  deliverWriterSop,
  type SopEmailMessage,
} from "@/lib/email-sop";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID } from "@/lib/mailchimp";
import type { SopDraft } from "@/lib/sop";

const sop: SopDraft = {
  title: "Guest room turnover",
  purpose: "Turn a room.",
  owner: "Housekeeping lead",
  trigger: "Checkout",
  tools: ["Cart"],
  kpi: "On time",
  steps: [{ number: 1, title: "Strip", detail: "Remove linen." }],
  exceptions: ["Damaged room"],
  checklist: ["Linens out"],
  safetyNotes: ["Wet floor"],
};

function body(intent: string, extra: Record<string, unknown> = {}) {
  return { email: "Lead@Example.com", intent, sop, tag: "builder", ...extra };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mailchimpFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = String(input);
    if (href.includes("/tag-search?")) return jsonResponse({ tags: [], total_items: 0 });
    if (href.endsWith("/segments")) return jsonResponse({ id: 9, name: "writer" });
    if (init?.method === "PUT") return jsonResponse({ email_address: "lead@example.com" });
    if (href.endsWith("/tags")) return jsonResponse({});
    throw new Error(`unexpected ${init?.method} ${href}`);
  }) as typeof fetch;
}

describe("email SOP delivery", () => {
  it("rejects a missing or invalid email before sending", async () => {
    const send = vi.fn();
    const missing = await deliverWriterSop({
      body: { intent: "copy-md", sop },
      env: {} as NodeJS.ProcessEnv,
      send,
    });
    expect(missing).toMatchObject({ ok: false, status: 400, error: "Enter a valid email." });
    expect(send).not.toHaveBeenCalled();
  });

  it("emails Markdown for copy and download, and HTML for print", async () => {
    const sent: SopEmailMessage[] = [];
    const send = vi.fn(async (message: SopEmailMessage) => {
      sent.push(message);
      return { ok: true };
    });
    const env = { EMAIL_FROM: "SOP Mojo <writer@sopmojo.com>" } as unknown as NodeJS.ProcessEnv;

    await expect(
      deliverWriterSop({ body: body("copy-md"), env, send }),
    ).resolves.toEqual({ ok: true });
    await expect(
      deliverWriterSop({ body: body("download-md"), env, send }),
    ).resolves.toEqual({ ok: true });
    await expect(
      deliverWriterSop({ body: body("print"), env, send }),
    ).resolves.toEqual({ ok: true });
    await expect(
      deliverWriterSop({ body: body("download-html"), env, send }),
    ).resolves.toEqual({ ok: true });

    expect(sent[0]?.subject).toBe("Your SOP: Guest room turnover");
    expect(sent[0]?.from).toBe("SOP Mojo <writer@sopmojo.com>");
    expect(sent[0]?.to).toBe("lead@example.com");
    expect(sent[0]?.attachments[0]?.filename).toBe("guest-room-turnover.md");
    expect(sent[0]?.text).toContain("# Guest room turnover");
    const markdown = Buffer.from(sent[0]?.attachments[0]?.content ?? "", "base64").toString("utf8");
    expect(markdown).toContain("# Guest room turnover");

    expect(sent[1]?.attachments[0]?.filename).toMatch(/\.md$/);
    const printFile = Buffer.from(sent[2]?.attachments[0]?.content ?? "", "base64").toString("utf8");
    expect(sent[2]?.attachments[0]?.filename).toBe("guest-room-turnover.html");
    expect(sent[2]?.attachments[0]?.contentType).toContain("text/html");
    expect(printFile).toContain("<!DOCTYPE html>");
    expect(printFile).toContain("Guest room turnover");
    expect(sent[2]?.text).toContain("Save as PDF");
    expect(sent[3]?.attachments[0]?.filename).toMatch(/\.html$/);
  });

  it("uses the Resend sandbox from-address when EMAIL_FROM is unset", async () => {
    let from = "";
    await deliverWriterSop({
      body: body("copy-prompt"),
      env: {} as NodeJS.ProcessEnv,
      send: async (message) => {
        from = message.from;
        return { ok: true };
      },
    });
    expect(from).toBe(DEFAULT_EMAIL_FROM);
    expect(DEFAULT_EMAIL_FROM).toContain("onboarding@resend.dev");
  });

  it("tags the writer audience and still succeeds when Mailchimp fails", async () => {
    const fetchImpl = mailchimpFetch();
    const env = {
      MAILCHIMP_API_KEY: "test-key-us21",
      EMAIL_FROM: "SOP Mojo <writer@sopmojo.com>",
    } as unknown as NodeJS.ProcessEnv;
    await expect(
      deliverWriterSop({
        body: body("copy-md"),
        env,
        fetchImpl,
        send: async () => ({ ok: true }),
      }),
    ).resolves.toEqual({ ok: true });

    const put = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[1]?.method === "PUT",
    );
    expect(String(put?.[0])).toContain(`/lists/${DEFAULT_MAILCHIMP_AUDIENCE_ID}/members/`);
    expect(JSON.parse(String(put?.[1]?.body)).email_address).toBe("lead@example.com");
    const tagged = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.find((call) =>
      String(call[0]).endsWith("/tags"),
    );
    expect(JSON.parse(String(tagged?.[1]?.body))).toEqual({
      tags: [{ name: "writer", status: "active" }],
    });

    const failingFetch = vi.fn(async () => {
      throw new Error("mailchimp down");
    }) as typeof fetch;
    await expect(
      deliverWriterSop({
        body: body("copy-md"),
        env,
        fetchImpl: failingFetch,
        send: async () => ({ ok: true }),
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("returns a clear error when the email cannot be sent and does not throw", async () => {
    await expect(
      deliverWriterSop({
        body: body("print"),
        env: { RESEND_API_KEY: "" } as unknown as NodeJS.ProcessEnv,
        send: async () => {
          throw new Error("network");
        },
      }),
    ).resolves.toEqual({ ok: false, error: EMAIL_SEND_ERROR, status: 502 });

    const missingKey = await deliverWriterSop({
      body: body("copy-md"),
      env: {} as NodeJS.ProcessEnv,
    });
    expect(missingKey).toEqual({ ok: false, error: EMAIL_SEND_ERROR, status: 502 });
  });
});

describe("email SOP route", () => {
  it("validates the payload and fails soft when Resend is not configured", async () => {
    const route = readFileSync(path.join(process.cwd(), "app/api/email-sop/route.ts"), "utf8");
    expect(route).toContain("deliverWriterSop");
    expect(route).not.toContain('tag: "builder"');

    const previousResend = process.env.RESEND_API_KEY;
    const previousMailchimp = process.env.MAILCHIMP_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.MAILCHIMP_API_KEY;
    try {
      const { POST } = await import("@/app/api/email-sop/route");
      const invalid = await POST(
        new Request("http://localhost/api/email-sop", { method: "POST", body: "{" }),
      );
      expect(invalid.status).toBe(400);

      const badEmail = await POST(
        new Request("http://localhost/api/email-sop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body("copy-md", { email: "not-an-email" })),
        }),
      );
      expect(badEmail.status).toBe(400);

      const unsent = await POST(
        new Request("http://localhost/api/email-sop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body("print")),
        }),
      );
      expect(unsent.status).toBe(502);
      await expect(unsent.json()).resolves.toMatchObject({ ok: false, error: EMAIL_SEND_ERROR });
    } finally {
      if (previousResend === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousResend;
      if (previousMailchimp === undefined) delete process.env.MAILCHIMP_API_KEY;
      else process.env.MAILCHIMP_API_KEY = previousMailchimp;
    }
  });
});
