import { describe, expect, it, vi } from "vitest";
import { fillScore } from "./helpers";
import {
  CALL_NEEDS_RESEND,
  CALL_NOT_CONFIGURED,
  CALL_SEND_ERROR,
  DEFAULT_CALL_REQUEST_TO,
  DEFAULT_EMAIL_FROM,
  buildCallEmail,
  handleCallRequest,
  resolveCallRecipient,
  resolveEmailFrom,
  type CallMessage,
} from "@/lib/call-request";
import { shareSummaryFromReport } from "@/lib/score";

const summary = shareSummaryFromReport(fillScore("exit", "C"));

describe("call request", () => {
  it("rejects a bad email and does not send", async () => {
    const send = vi.fn();
    const result = await handleCallRequest({
      body: { email: "not-an-email", summary },
      env: {
        RESEND_API_KEY: "re_test",
        CALL_REQUEST_TO: "ryan@sopmojo.com",
      } as unknown as NodeJS.ProcessEnv,
      send,
    });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/valid email/i);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends to ryan@sopmojo.com when the recipient env is unset", async () => {
    const send = vi.fn<(message: CallMessage) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
    const result = await handleCallRequest({
      body: { email: "lead@acme.com", summary },
      env: { RESEND_API_KEY: "re_test" } as unknown as NodeJS.ProcessEnv,
      send,
    });
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(send.mock.calls[0]?.[0]?.to).toBe(DEFAULT_CALL_REQUEST_TO);
    expect(resolveCallRecipient({} as NodeJS.ProcessEnv)).toBe("ryan@sopmojo.com");
    expect(resolveCallRecipient({ CALL_REQUEST_TO: "  " } as unknown as NodeJS.ProcessEnv)).toBe("ryan@sopmojo.com");
    expect(
      resolveCallRecipient({
        CALL_REQUEST_TO: "ryan@sopmojo.com",
        MEETING_REQUEST_TO: "other@example.com",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe("ryan@sopmojo.com");
  });

  it("holds the send when the recipient override is not an email", async () => {
    const send = vi.fn();
    const result = await handleCallRequest({
      body: { email: "lead@acme.com", summary },
      env: { RESEND_API_KEY: "re_test", CALL_REQUEST_TO: "not-an-email" } as unknown as NodeJS.ProcessEnv,
      send,
    });
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ ok: false, error: CALL_NOT_CONFIGURED });
    expect(send).not.toHaveBeenCalled();
    expect(resolveCallRecipient({ CALL_REQUEST_TO: "not-an-email" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("holds the send when Resend is not configured", async () => {
    const result = await handleCallRequest({
      body: { email: "lead@acme.com", summary },
      env: { CALL_REQUEST_TO: "ryan@sopmojo.com" } as unknown as NodeJS.ProcessEnv,
    });
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ ok: false, error: CALL_NEEDS_RESEND });
  });

  it("emails the configured inbox with the score and a documentation request", async () => {
    const send = vi.fn<(message: CallMessage) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
    const result = await handleCallRequest({
      body: {
        email: " Lead@Acme.com ",
        name: "Ada <script>",
        note: "We need SOPs before we automate.",
        summary: {
          ...summary,
          gaps: ["Coverage — <script>alert(1)</script>"],
        },
      },
      env: {
        RESEND_API_KEY: "re_test",
        CALL_REQUEST_TO: "Ryan@sopmojo.com",
      } as unknown as NodeJS.ProcessEnv,
      send,
    });
    expect(result).toEqual({ status: 200, body: { ok: true } });
    const message = send.mock.calls[0]?.[0];
    expect(message).toBeTruthy();
    if (!message) return;
    expect(message.to).toBe("ryan@sopmojo.com");
    expect(message.replyTo).toBe("lead@acme.com");
    expect(message.from).toBe(DEFAULT_EMAIL_FROM);
    expect(message.subject).toBe(`Request a call — Ops Scalability Score ${summary.score}/100`);
    expect(message.text).toContain("wants to discuss how SOP Mojo can help document their workflows");
    expect(message.text).toContain("Ada <script> (lead@acme.com)");
    expect(message.text).toContain(`${summary.score} / 100`);
    expect(message.html).toContain("document their workflows");
    expect(message.html).toContain("https://writer.sopmojo.com");
    expect(message.html).toContain("https://flowchart.sopmojo.com");
    expect(message.html).toContain("https://builder.sopmojo.com");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).not.toContain("<script>");
    expect(message.text).toContain("not a valuation");
  });

  it("accepts MEETING_REQUEST_TO and surfaces a send failure", async () => {
    const result = await handleCallRequest({
      body: { email: "lead@acme.com", name: "", summary },
      env: {
        RESEND_API_KEY: "re_test",
        MEETING_REQUEST_TO: "meetings@example.com",
        EMAIL_FROM: "SOP Mojo <audit@sopmojo.com>",
      } as unknown as NodeJS.ProcessEnv,
      send: async () => ({ ok: false }),
    });
    expect(result.status).toBe(502);
    expect(result.body.error).toBe(CALL_SEND_ERROR);
    expect(resolveEmailFrom({ EMAIL_FROM: " SOP Mojo <audit@sopmojo.com> " } as unknown as NodeJS.ProcessEnv)).toBe(
      "SOP Mojo <audit@sopmojo.com>",
    );
    expect(resolveCallRecipient({ MEETING_REQUEST_TO: "meetings@example.com" } as unknown as NodeJS.ProcessEnv)).toBe(
      "meetings@example.com",
    );
  });

  it("still describes the request when no score is attached", () => {
    const message = buildCallEmail({
      to: "ryan@sopmojo.com",
      request: { email: "lead@acme.com" },
      from: DEFAULT_EMAIL_FROM,
    });
    expect(message.subject).toBe("Request a call — Ops Scalability Score");
    expect(message.text).toContain("document their workflows");
    expect(message.text).not.toContain("Score summary");
    expect(message.html).toContain("Open the audit");
  });
});
