import { describe, expect, it, vi, afterEach } from "vitest";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID, mailchimpSettings, tagAudienceMember } from "@/lib/mailchimp";
import { resetRateLimits } from "@/lib/rate-limit";
import { emailFooterLines, SITE, STARTER_KIT_URL, WRITER_UPGRADE_URL } from "@/lib/site";
import type { SopDraft } from "@/lib/sop";
import { buildTemplateEmail, deliverTemplateLead } from "@/lib/template-lead";
import { getTemplate } from "@/lib/templates";
import type { SopEmailMessage } from "@/lib/email-sop";

const draft: SopDraft = {
  title: "Kitchen opening draft",
  purpose: "Open the line.",
  owner: "Kitchen manager",
  trigger: "First shift arrives",
  tools: ["Thermometer"],
  kpi: "Line check done",
  steps: [{ number: 1, title: "Log temps", detail: "Write them down." }],
  exceptions: ["Cooler is warm"],
  checklist: ["Line check signed"],
  safetyNotes: ["Hot surfaces"],
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mailchimpFetch() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = String(input);
    if (href.includes("/tag-search?")) return jsonResponse({ tags: [], total_items: 0 });
    if (href.endsWith("/segments")) return jsonResponse({ id: 9, name: "template" });
    if (init?.method === "PUT") return jsonResponse({ email_address: "lead@example.com" });
    if (href.endsWith("/tags")) return jsonResponse({});
    throw new Error(`unexpected ${init?.method} ${href}`);
  });
}

afterEach(() => {
  resetRateLimits();
});

describe("template lead validation", () => {
  it("rejects a missing name, a bad email, an unknown slug, and a honeypot before sending", async () => {
    const send = vi.fn();
    const fetchImpl = vi.fn();
    const env = {} as unknown as NodeJS.ProcessEnv;
    const base = { firstName: "Ada", email: "lead@example.com", slug: "restaurant-sop-template" };

    await expect(
      deliverTemplateLead({ body: { ...base, firstName: " " }, env, send, fetchImpl }),
    ).resolves.toMatchObject({ ok: false, status: 400, error: "Enter your first name." });
    await expect(
      deliverTemplateLead({ body: { ...base, email: "not-an-email" }, env, send, fetchImpl }),
    ).resolves.toMatchObject({ ok: false, status: 400, error: "Enter a valid email." });
    await expect(
      deliverTemplateLead({ body: { ...base, slug: "not-a-template" }, env, send, fetchImpl }),
    ).resolves.toMatchObject({ ok: false, status: 400, error: "Unknown template." });
    await expect(
      deliverTemplateLead({
        body: { ...base, company_website: "https://spam.example" },
        env,
        send,
        fetchImpl,
      }),
    ).resolves.toMatchObject({ ok: false, status: 400 });
    await expect(
      deliverTemplateLead({ body: { ...base, draft: { title: "nope" } }, env, send, fetchImpl }),
    ).resolves.toMatchObject({ ok: false, status: 400, error: "That draft could not be attached." });

    expect(send).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rate limits repeated posts from one IP", async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const env = {} as unknown as NodeJS.ProcessEnv;
    const body = { firstName: "Ada", email: "lead@example.com", slug: "payroll-sop-template" };
    for (let i = 0; i < 5; i += 1) {
      await expect(
        deliverTemplateLead({ body, env, ip: "203.0.113.10", now: 1_000, send }),
      ).resolves.toEqual({ ok: true });
    }
    await expect(
      deliverTemplateLead({ body, env, ip: "203.0.113.10", now: 1_000, send }),
    ).resolves.toMatchObject({ ok: false, status: 429 });
    expect(send).toHaveBeenCalledTimes(5);
  });
});

describe("template email and Mailchimp payload", () => {
  it("attaches the template, the draft, the checkout link, and the configured footer", async () => {
    const template = getTemplate("restaurant-sop-template");
    if (!template) throw new Error("missing template");
    const message = buildTemplateEmail({
      to: "lead@example.com",
      firstName: "Ada",
      template,
      draft,
      from: "SOP Mojo <writer@sopmojo.com>",
      env: { BUSINESS_ADDRESS: "100 Example Plaza, Suite 1" } as unknown as NodeJS.ProcessEnv,
    });
    expect(message.subject).toBe("Your Restaurant SOP Template");
    expect(message.text).toContain("Hi Ada,");
    expect(message.text).toContain(WRITER_UPGRADE_URL);
    expect(message.text).toContain(STARTER_KIT_URL);
    expect(message.text).toContain("100 Example Plaza, Suite 1");
    expect(message.text).toContain(SITE.legalName);
    expect(message.text.toLowerCase()).not.toContain("samcart");
    expect(message.html.toLowerCase()).not.toContain("samcart");
    expect(message.attachments.map((file) => file.filename)).toEqual([
      "restaurant-sop-template.md",
      "restaurant-sop-template.html",
      "your-draft-kitchen-opening-draft.md",
    ]);
    const markdown = Buffer.from(message.attachments[0]?.content ?? "", "base64").toString("utf8");
    expect(markdown).toContain("## Checklist");
    expect(markdown).toContain("Line check signed");
    const html = Buffer.from(message.attachments[1]?.content ?? "", "base64").toString("utf8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Records and sign-off");
    const draftFile = Buffer.from(message.attachments[2]?.content ?? "", "base64").toString("utf8");
    expect(draftFile).toContain("# Kitchen opening draft");

    const bare = emailFooterLines({} as NodeJS.ProcessEnv);
    expect(bare.join("\n")).toContain(SITE.legalName);
    expect(bare.join("\n")).toContain(SITE.founderEmail);
    expect(bare.join("\n")).not.toMatch(/\d{5}/);
  });

  it("upserts FNAME and the writer, template, and topic tags without a live call", async () => {
    const fetchImpl = mailchimpFetch();
    const env = {
      MAILCHIMP_API_KEY: "test-key-us21",
      EMAIL_FROM: "SOP Mojo <writer@sopmojo.com>",
    } as unknown as NodeJS.ProcessEnv;
    const sent: SopEmailMessage[] = [];
    await expect(
      deliverTemplateLead({
        body: {
          firstName: "  Ada ",
          email: "Lead@Example.com",
          slug: "restaurant-sop-template",
          draft,
        },
        env,
        fetchImpl: fetchImpl as typeof fetch,
        send: async (message) => {
          sent.push(message);
          return { ok: true };
        },
      }),
    ).resolves.toEqual({ ok: true });

    const put = fetchImpl.mock.calls.find((call) => call[1]?.method === "PUT");
    expect(String(put?.[0])).toContain(`/lists/${DEFAULT_MAILCHIMP_AUDIENCE_ID}/members/`);
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      email_address: "lead@example.com",
      status_if_new: "subscribed",
      merge_fields: { FNAME: "Ada" },
    });
    const tagged = fetchImpl.mock.calls.find((call) => String(call[0]).endsWith("/tags"));
    expect(JSON.parse(String(tagged?.[1]?.body))).toEqual({
      tags: [
        { name: "writer", status: "active" },
        { name: "template", status: "active" },
        { name: "tpl-restaurant", status: "active" },
      ],
    });
    expect(sent[0]?.to).toBe("lead@example.com");
    expect(sent[0]?.attachments).toHaveLength(3);

    const settings = mailchimpSettings(env);
    if (!settings) throw new Error("expected settings");
    await expect(
      tagAudienceMember({
        email: "lead@example.com",
        tag: "not-a-real-tag",
        settings,
        fetchImpl: vi.fn() as typeof fetch,
      }),
    ).resolves.toEqual({ ok: false, reason: "tag" });
  });

  it("still sends when Mailchimp is unconfigured", async () => {
    const fetchImpl = vi.fn();
    await expect(
      deliverTemplateLead({
        body: { firstName: "Ada", email: "lead@example.com", slug: "hr-sop-template" },
        env: {} as unknown as NodeJS.ProcessEnv,
        fetchImpl: fetchImpl as typeof fetch,
        send: async () => ({ ok: true }),
      }),
    ).resolves.toEqual({ ok: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("template lead route", () => {
  it("validates JSON and does not send when the body is incomplete", async () => {
    const previousResend = process.env.RESEND_API_KEY;
    const previousMailchimp = process.env.MAILCHIMP_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.MAILCHIMP_API_KEY;
    try {
      const { POST } = await import("@/app/api/template-lead/route");
      const invalid = await POST(
        new Request("http://localhost/api/template-lead", { method: "POST", body: "{" }),
      );
      expect(invalid.status).toBe(400);
      const bad = await POST(
        new Request("http://localhost/api/template-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName: "Ada", email: "nope", slug: "hr-sop-template" }),
        }),
      );
      expect(bad.status).toBe(400);
    } finally {
      if (previousResend === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousResend;
      if (previousMailchimp === undefined) delete process.env.MAILCHIMP_API_KEY;
      else process.env.MAILCHIMP_API_KEY = previousMailchimp;
    }
  });
});
