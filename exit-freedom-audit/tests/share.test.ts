import { describe, expect, it, vi } from "vitest";
import { fillScore } from "./helpers";
import {
  DEFAULT_EMAIL_FROM,
  SHARE_SEND_ERROR,
  SHARE_UNAVAILABLE,
  buildShareEmail,
  handleShare,
  resolveEmailFrom,
  type ShareMessage,
} from "@/lib/share";
import { shareSummaryFromReport } from "@/lib/score";

const summary = shareSummaryFromReport(fillScore("exit", "C"));

describe("share email", () => {
  it("rejects a bad teammate email", async () => {
    const send = vi.fn();
    const result = await handleShare({
      body: { to: "ops-at-acme", summary },
      env: { RESEND_API_KEY: "re_test" } as unknown as NodeJS.ProcessEnv,
      send,
    });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/valid Ops email/i);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns a clear error when Resend is not configured", async () => {
    const result = await handleShare({
      body: { to: "ops@acme.com", summary },
      env: {} as unknown as NodeJS.ProcessEnv,
    });
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ ok: false, error: SHARE_UNAVAILABLE });
  });

  it("sends the score with a footer the recipient cannot opt out of", async () => {
    const send = vi.fn<(message: ShareMessage) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
    const result = await handleShare({
      body: {
        to: " Ops@Acme.com ",
        replyTo: "owner@acme.com",
        summary: {
          ...summary,
          gaps: ["Coverage — <script>alert(1)</script>"],
        },
      },
      env: { RESEND_API_KEY: "re_test" } as unknown as NodeJS.ProcessEnv,
      send,
    });
    expect(result).toEqual({ status: 200, body: { ok: true } });
    const message = send.mock.calls[0]?.[0];
    expect(message).toBeTruthy();
    if (!message) return;
    expect(message.to).toBe("ops@acme.com");
    expect(message.replyTo).toBe("owner@acme.com");
    expect(message.from).toBe(DEFAULT_EMAIL_FROM);
    expect(message.subject).toBe(`Our Ops Scalability Score — ${summary.score}/100`);
    expect(message.html).toContain("Let SOP Mojo help you scale");
    expect(message.html).toContain("https://writer.sopmojo.com");
    expect(message.html).toContain("https://flowchart.sopmojo.com");
    expect(message.html).toContain("https://builder.sopmojo.com");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).not.toContain("<script>");
    expect(message.text).toContain("Let SOP Mojo help you scale");
    expect(message.text).toContain("not a valuation");
  });

  it("surfaces a send failure without throwing", async () => {
    const result = await handleShare({
      body: { to: "ops@acme.com", summary },
      env: { RESEND_API_KEY: "re_test", EMAIL_FROM: "SOP Mojo <audit@sopmojo.com>" } as unknown as NodeJS.ProcessEnv,
      send: async () => ({ ok: false }),
    });
    expect(result.status).toBe(502);
    expect(result.body.error).toBe(SHARE_SEND_ERROR);
    expect(resolveEmailFrom({ EMAIL_FROM: " SOP Mojo <audit@sopmojo.com> " } as unknown as NodeJS.ProcessEnv)).toBe(
      "SOP Mojo <audit@sopmojo.com>",
    );
  });

  it("keeps the pitch in the built HTML even if the caller only asked for the score", () => {
    const message = buildShareEmail({
      to: "ops@acme.com",
      summary,
      from: DEFAULT_EMAIL_FROM,
    });
    expect(message.html).toContain("Team — here's where we stand.");
    expect(message.html).toContain("Open full report");
    expect(message.html).toContain("Score powered by SOP Mojo");
  });
});
