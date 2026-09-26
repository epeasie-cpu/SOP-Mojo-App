import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEAVE_BROWSER_ACTIONS, leaveActionRequiresEmail } from "@/lib/leave-gate";
import { sessionFromAuthBody } from "@/lib/session";

function readWriter(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("generator leave-browser gate", () => {
  const source = readWriter("components/Generator.tsx");
  const modal = readWriter("components/EmailSopModal.tsx");

  it("keeps generate free and gates copy, download, and print", () => {
    const submit = source.slice(
      source.indexOf("async function onSubmit"),
      source.indexOf("async function performLeave"),
    );
    expect(submit).toContain("/api/generate");
    expect(submit).not.toContain("requestLeave");
    expect(submit).not.toContain("readSessionSnapshot");

    for (const action of LEAVE_BROWSER_ACTIONS) {
      expect(source).toContain(`requestLeave("${action.id}")`);
      expect(source).toContain(`data-leave-action="${action.id}"`);
      expect(source).toContain(action.label);
    }
    expect(leaveActionRequiresEmail(false)).toBe(true);
    expect(leaveActionRequiresEmail(true)).toBe(false);
    expect(source).toContain("pendingLeave.current = action");
    expect(source).toContain("void performLeave(intent)");
    expect(source).toContain("/api/email-sop");
    expect(source).not.toContain("notifyLeadCapture");
    expect(source).not.toContain("signUpWithBuilder");
    expect(source).not.toContain("signInWithBuilder");
    expect(source).not.toContain("readSessionSnapshot");
    expect(source).not.toContain("flowchart_plus");
    expect(source).not.toContain("Unlock this browser");
    expect(source).not.toContain("mysamcart.com");
  });

  it("asks for an email to send the SOP, without a password or account", () => {
    expect(modal).toContain('type="email"');
    expect(modal).toContain("Enter email to get your SOP in your inbox");
    expect(modal).toContain("Email me this SOP");
    expect(modal).toContain("Not now");
    expect(modal).not.toContain('type="password"');
    expect(modal).not.toContain("Create free account");
    expect(modal).not.toContain("Sign in");
    expect(modal).not.toContain("signUpWithBuilder");
    expect(modal).not.toContain("signInWithBuilder");
    expect(modal).not.toContain("mysamcart.com");
    expect(modal).not.toContain("google");
    expect(source).not.toContain('type="email"');
  });
});

describe("writer session", () => {
  it("refuses a signup that has not returned an access token", () => {
    expect(() => sessionFromAuthBody({ user: { id: "user-1", email: "a@b.co" } })).toThrow(
      /confirm this account/i,
    );
  });

  it("keeps a password session from the shared Supabase project", () => {
    expect(
      sessionFromAuthBody({
        access_token: "token",
        refresh_token: "refresh",
        user: { id: "user-1", email: "a@b.co" },
      }),
    ).toMatchObject({
      accessToken: "token",
      refreshToken: "refresh",
      userId: "user-1",
      email: "a@b.co",
    });
  });
});

describe("writer capture route", () => {
  it("tags writer from the Supabase access token and ignores a client-supplied tag", async () => {
    const route = readWriter("app/api/capture/route.ts");
    expect(route).toContain('tag: "writer"');
    expect(route).not.toContain("request.json");

    const previous = process.env.MAILCHIMP_API_KEY;
    delete process.env.MAILCHIMP_API_KEY;
    try {
      const { POST } = await import("@/app/api/capture/route");
      const response = await POST(
        new Request("http://localhost/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "stranger@example.com", tag: "builder" }),
        }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ ok: true, skipped: true });
    } finally {
      if (previous === undefined) delete process.env.MAILCHIMP_API_KEY;
      else process.env.MAILCHIMP_API_KEY = previous;
    }
  });
});
