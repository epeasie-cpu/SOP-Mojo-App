import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OPTIONS, POST } from "@/app/api/lead/cpt-kit/route";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { proxy } from "@/proxy";
import { cptKitClaimKey, cptKitEmail, cptKitUrl, resetCptKitRateLimit, submitCptKit } from "@/lib/cpt-kit";
import {
  CPT_KIT_BUILDER_PRO_GO,
  CPT_KIT_DISCLAIMER,
  CPT_KIT_FAQ,
  CPT_KIT_PATH,
  CPT_KIT_READY_PATH,
  CPT_KIT_SEO_DESCRIPTION,
  CPT_KIT_SEO_H1,
  CPT_KIT_SEO_TITLE,
  cptKitFaqJsonLd,
  cptKitLandingMetadata,
} from "@/lib/cpt-kit-page";
import { credentialSendKey, memoryEventStore } from "@/lib/event-store";
import { headerLogoHref, hidesAccountHeaderLink } from "@/lib/lead-pages";
import { LEAD_POPUP_OFFERS, leadPopupScript } from "@/lib/lead-popup";
import { LEAD_QA_EMAILS_ENV, isLeadQaEmail } from "@/lib/lead-qa";
import { CPT_KIT_TAG, LEAD_MAGNET_TAG, LEAD_QA_TAG, POPUP_LEAD_TAG, THERAPY_LEAD_TAG } from "@/lib/mailchimp";
import { isNoIndexPath, NOINDEX_HEADER } from "@/lib/robots";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID } from "@/lib/site";

const kit = "https://files.example/2027-slp-cpt-kit";

beforeEach(() => {
  resetCptKitRateLimit();
});

describe("2027 SLP CPT kit", () => {
  it("renders a plain CPT kit email with an escaped greeting", () => {
    const letter = cptKitEmail(kit, "Alex Rivera");
    expect(letter.subject).toBe("Your 2027 SLP CPT Code Transition Kit");
    expect(letter.text.startsWith("Hi Alex,")).toBe(true);
    expect(letter.text).toContain("Open your kit: " + kit);
    expect(letter.text).toContain(CPT_KIT_BUILDER_PRO_GO);
    expect(letter.text).toContain("Ryan Pease");
    expect(letter.text).toContain("SOP Mojo");
    expect(letter.html).toContain(`href="${kit}"`);
    expect(letter.html).toContain(`href="${CPT_KIT_BUILDER_PRO_GO}"`);
    expect(letter.html).toContain("Open your kit");
    expect(letter.html).toContain("See SOP Builder Pro");
    expect(letter.html).toContain('alt="SOP Mojo"');
    expect(letter.html).toContain("https://pay.sopmojo.com/email/sop-mojo-logo.png");
    expect(letter.html).toContain("max-width:600px");
    expect(letter.html).toContain("#C1FF72");
    expect(letter.html).toContain("#0C0E0C");
    expect(letter.html).not.toContain("unsubscribe");
    expect(letter.text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(letter.html).not.toMatch(/\p{Extended_Pictographic}/u);

    const escaped = cptKitEmail(kit, "<b>Ann</b>");
    expect(escaped.html).toContain("Hi &lt;b&gt;Ann&lt;/b&gt;,");
    expect(escaped.html).not.toContain("<b>Ann</b>");
    expect(escaped.text.startsWith("Hi <b>Ann</b>,")).toBe(true);
    expect(cptKitEmail(kit, "A&B Lee").html).toContain("Hi A&amp;B,");

    expect(cptKitEmail(kit, "   ").text.startsWith("Hi there,")).toBe(true);
    expect(cptKitEmail(kit).text.startsWith("Hi there,")).toBe(true);
  });

  it("emails the kit once, tags Mailchimp, and refuses to send when the URL is not https", async () => {
    expect(CPT_KIT_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(CPT_KIT_DISCLAIMER).toBe("Educational, not billing advice.");
    const letter = cptKitEmail(kit, "Alex Rivera");
    expect(letter.subject).toBe("Your 2027 SLP CPT Code Transition Kit");
    expect(letter.text).toContain("Hi Alex,");
    expect(letter.text).toContain(kit);
    expect(letter.text).toContain("one-page job aid");
    expect(letter.text).toContain("92507");
    expect(letter.text).toContain(CPT_KIT_BUILDER_PRO_GO);
    expect(letter.html).toContain(`href="${kit}"`);
    expect(letter.text).not.toMatch(/Cassidy|Red Hat|RHTC/i);

    const mail: { url: string; body: Record<string, unknown> | null }[] = [];
    const resend: { text?: string }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      if (url.includes("api.mailchimp.com")) mail.push({ url, body });
      if (url.includes("api.resend.com")) {
        resend.push(body as { text?: string });
        return Response.json({ id: "re_cpt_1" });
      }
      return Response.json({ id: "ok" });
    };
    const env = {
      RESEND_API_KEY: "re_test",
      MAILCHIMP_API_KEY: "key-us21",
      MAILCHIMP_AUDIENCE_ID: "other-audience",
      CPT_KIT_URL: kit,
    } as unknown as NodeJS.ProcessEnv;
    const store = memoryEventStore();
    const input = {
      email: "Buyer@Example.com",
      name: "Alex Rivera",
      company: "",
      ip: "203.0.113.50",
      env,
      fetchImpl,
      store,
    };
    const logs: string[] = [];
    const infoSpy = vi.spyOn(console, "info").mockImplementation((message) => {
      logs.push(String(message));
    });
    expect(await submitCptKit(input)).toEqual({ ok: true });
    expect(await submitCptKit({ ...input, name: "Again" })).toEqual({ ok: true });
    expect(resend).toHaveLength(1);
    expect(resend[0]?.text).toContain(kit);
    expect(credentialSendKey(cptKitClaimKey("Buyer@Example.com"))).toBe("buyer@example.com|cpt-kit");
    expect(mail.some((call) => call.url.includes(DEFAULT_MAILCHIMP_AUDIENCE_ID))).toBe(true);
    expect(mail.some((call) => call.url.includes("other-audience"))).toBe(false);
    const tagged = mail.find((call) => call.url.endsWith("/tags"));
    expect(tagged?.body).toEqual({
      tags: [
        { name: CPT_KIT_TAG, status: "active" },
        { name: LEAD_MAGNET_TAG, status: "active" },
        { name: THERAPY_LEAD_TAG, status: "active" },
      ],
    });
    expect(JSON.stringify(tagged?.body)).not.toContain(POPUP_LEAD_TAG);
    expect(JSON.stringify(tagged?.body)).not.toContain(`"${LEAD_QA_TAG}"`);
    expect(logs.join("\n")).toContain('"source":"cpt-kit"');
    expect(logs.join("\n")).toContain('"id":"re_cpt_1"');
    expect(logs.join("\n")).not.toContain("buyer");
    infoSpy.mockRestore();

    const popupMail: { body: Record<string, unknown> | null }[] = [];
    const popupLogs: string[] = [];
    const popupInfo = vi.spyOn(console, "info").mockImplementation((message) => {
      popupLogs.push(String(message));
    });
    expect(
      await submitCptKit({
        ...input,
        email: "popup@example.com",
        popup: true,
        ip: "203.0.113.51",
        store: memoryEventStore(),
        fetchImpl: async (inputUrl, init) => {
          const url = String(inputUrl);
          const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
          if (url.endsWith("/tags")) popupMail.push({ body });
          if (url.includes("api.resend.com")) return Response.json({ id: "re_cpt_popup" });
          return Response.json({});
        },
      }),
    ).toEqual({ ok: true });
    expect(popupMail[0]?.body).toEqual({
      tags: [
        { name: CPT_KIT_TAG, status: "active" },
        { name: LEAD_MAGNET_TAG, status: "active" },
        { name: THERAPY_LEAD_TAG, status: "active" },
        { name: POPUP_LEAD_TAG, status: "active" },
      ],
    });
    expect(popupLogs.join("\n")).toContain('"source":"cpt-kit-popup"');
    popupInfo.mockRestore();

    const errors: string[] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation((message) => {
      errors.push(String(message));
    });
    let calls = 0;
    expect(
      await submitCptKit({
        ...input,
        email: "missing@example.com",
        ip: "203.0.113.52",
        env: { RESEND_API_KEY: "re_test", CPT_KIT_URL: "http://files.example/kit" } as unknown as NodeJS.ProcessEnv,
        store: memoryEventStore(),
        fetchImpl: async () => {
          calls += 1;
          return Response.json({});
        },
      }),
    ).toEqual({ ok: false, code: "send" });
    expect(cptKitUrl({ CPT_KIT_URL: "" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(calls).toBe(0);
    expect(errors.join("\n")).toContain('"source":"cpt-kit"');
    expect(errors.join("\n")).toContain('"reason":"unset"');
    expect(errors.join("\n")).not.toContain("missing@");
    errorSpy.mockRestore();

    expect(
      await submitCptKit({
        ...input,
        company: "Acme",
        store: memoryEventStore(),
        fetchImpl: async () => {
          throw new Error("honeypot");
        },
      }),
    ).toEqual({ ok: true });
    expect(await submitCptKit({ ...input, email: "nope", store: memoryEventStore() })).toEqual({ ok: false, code: "email" });
    expect(await submitCptKit({ ...input, name: " ", store: memoryEventStore() })).toEqual({ ok: false, code: "name" });

    for (let i = 0; i < 5; i += 1) {
      expect(
        await submitCptKit({
          ...input,
          email: `rate${i}@example.com`,
          ip: "203.0.113.59",
          store: memoryEventStore(),
        }),
      ).toEqual({ ok: true });
    }
    expect(
      await submitCptKit({
        ...input,
        email: "rate-blocked@example.com",
        ip: "203.0.113.59",
        store: memoryEventStore(),
      }),
    ).toEqual({ ok: false, code: "rate" });
  });

  it("lets a QA allowlist address sign up again and tags it qa", async () => {
    expect(isLeadQaEmail("QA@Example.com", { [LEAD_QA_EMAILS_ENV]: "other@example.com, qa@example.com" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isLeadQaEmail("person@example.com", { [LEAD_QA_EMAILS_ENV]: "qa@example.com" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isLeadQaEmail("qa@example.com", {} as unknown as NodeJS.ProcessEnv)).toBe(false);

    const resend: string[] = [];
    let claims = 0;
    const store = memoryEventStore();
    const watched = {
      ...store,
      claimCredentialSend: async (email: string) => {
        claims += 1;
        return store.claimCredentialSend(email);
      },
    };
    const env = {
      RESEND_API_KEY: "re_test",
      MAILCHIMP_API_KEY: "key-us21",
      CPT_KIT_URL: kit,
      [LEAD_QA_EMAILS_ENV]: "qa@example.com",
    } as unknown as NodeJS.ProcessEnv;
    const tags: Record<string, unknown>[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      if (url.endsWith("/tags") && body) tags.push(body);
      if (url.includes("api.resend.com")) {
        resend.push("sent");
        return Response.json({ id: "re_qa" });
      }
      return Response.json({});
    };
    const input = {
      email: "QA@Example.com",
      name: "Preview",
      company: "",
      ip: "203.0.113.70",
      env,
      fetchImpl,
      store: watched,
      popup: true,
    };
    expect(await submitCptKit(input)).toEqual({ ok: true });
    expect(await submitCptKit(input)).toEqual({ ok: true });
    expect(resend).toHaveLength(2);
    expect(claims).toBe(0);
    expect(tags[0]).toEqual({
      tags: [
        { name: CPT_KIT_TAG, status: "active" },
        { name: LEAD_MAGNET_TAG, status: "active" },
        { name: THERAPY_LEAD_TAG, status: "active" },
        { name: POPUP_LEAD_TAG, status: "active" },
        { name: LEAD_QA_TAG, status: "active" },
      ],
    });

    const once: string[] = [];
    const realStore = memoryEventStore();
    const realFetch: typeof fetch = async (inputUrl) => {
      if (String(inputUrl).includes("api.resend.com")) {
        once.push("sent");
        return Response.json({ id: "re_real" });
      }
      return Response.json({});
    };
    expect(
      await submitCptKit({
        ...input,
        email: "real@example.com",
        ip: "203.0.113.71",
        store: realStore,
        popup: false,
        fetchImpl: realFetch,
      }),
    ).toEqual({ ok: true });
    expect(
      await submitCptKit({
        ...input,
        email: "real@example.com",
        ip: "203.0.113.72",
        store: realStore,
        popup: false,
        fetchImpl: realFetch,
      }),
    ).toEqual({ ok: true });
    expect(once).toEqual(["sent"]);
  });

  it("publishes the kit page, keeps the file link out of the HTML, and registers the popup offer", async () => {
    expect(CPT_KIT_SEO_TITLE).toBe("2027 SLP CPT Code Transition Kit (Free) | SOP Mojo");
    expect(CPT_KIT_SEO_H1).toBe("2027 SLP CPT Code Transition Kit (Free)");
    const meta = cptKitLandingMetadata();
    expect(meta.alternates).toEqual({ canonical: `https://pay.sopmojo.com${CPT_KIT_PATH}` });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(cptKitFaqJsonLd()["@type"]).toBe("FAQPage");
    expect(CPT_KIT_FAQ.length).toBeGreaterThan(0);

    const listed = await (await sitemap()).text();
    expect(listed).toContain(`https://pay.sopmojo.com${CPT_KIT_PATH}`);
    expect(listed).not.toContain(CPT_KIT_READY_PATH);
    const robotsBody = await (await robots()).text();
    expect(robotsBody).toContain(`Allow: ${CPT_KIT_PATH}`);
    expect(isNoIndexPath(CPT_KIT_PATH)).toBe(false);
    expect(isNoIndexPath(CPT_KIT_READY_PATH)).toBe(true);
    const ready = proxy(new NextRequest(`https://pay.sopmojo.com${CPT_KIT_READY_PATH}`));
    expect(ready.headers.get("x-robots-tag")).toBe(NOINDEX_HEADER);

    const landing = readFileSync(path.join(process.cwd(), "components/CptKitLanding.tsx"), "utf8");
    const copy = readFileSync(path.join(process.cwd(), "lib/cpt-kit-page.ts"), "utf8");
    const readyPage = readFileSync(path.join(process.cwd(), "app/2027-slp-cpt-kit/ready/page.tsx"), "utf8");
    const page = readFileSync(path.join(process.cwd(), "app/2027-slp-cpt-kit/page.tsx"), "utf8");
    const forbidden = /Cassidy|Red Hat|RHTC|testimonial|case study|CPT_KIT_URL|files\.example/i;
    expect(copy).toContain("12/31/2026");
    expect(copy).toContain("1/1/2027");
    expect(copy).toContain("payer rates");
    expect(copy).toContain(CPT_KIT_DISCLAIMER);
    expect(landing).toContain("CPT_KIT_PARTS");
    expect(landing).toContain('name="name"');
    expect(landing).toContain('name="email"');
    expect(landing).toContain('name="company"');
    expect(landing).not.toMatch(forbidden);
    expect(copy).not.toMatch(forbidden);
    expect(readyPage).not.toMatch(forbidden);
    expect(page).not.toMatch(forbidden);
    expect(readyPage).toContain("CPT_KIT_BUILDER_PRO_GO");
    expect(readyPage).toContain("not on this page");
    expect(hidesAccountHeaderLink(CPT_KIT_PATH)).toBe(true);
    expect(hidesAccountHeaderLink(CPT_KIT_READY_PATH)).toBe(true);
    expect(headerLogoHref(CPT_KIT_PATH)).toBe("https://www.sopmojo.com");
    expect(headerLogoHref(CPT_KIT_READY_PATH)).toBe("https://www.sopmojo.com");

    const offer = LEAD_POPUP_OFFERS["cpt-kit"];
    expect(offer.endpoint).toBe("https://pay.sopmojo.com/api/lead/cpt-kit");
    expect(offer.button).toBe("Email me the kit");
    expect(offer.secondaryHref).toBe(`https://pay.sopmojo.com${CPT_KIT_PATH}`);
    const script = leadPopupScript();
    new Function(script);
    expect(script).toContain(offer.endpoint);
    expect(script).toContain(offer.headline);
    expect(script).not.toContain("CPT_KIT_URL");
    const demo = readFileSync(path.join(process.cwd(), "app/embed/demo/page.tsx"), "utf8");
    expect(demo).toContain("LEAD_POPUP_OFFERS");
    expect(demo).toContain("Loaded offer");

    const allowed = await OPTIONS(
      new Request("https://pay.sopmojo.com/api/lead/cpt-kit", {
        method: "OPTIONS",
        headers: { Origin: "https://www.sopmojo.com" },
      }),
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://www.sopmojo.com");
    const blocked = await OPTIONS(
      new Request("https://pay.sopmojo.com/api/lead/cpt-kit", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.com" },
      }),
    );
    expect(blocked.status).toBe(403);
    expect(blocked.headers.get("access-control-allow-origin")).toBeNull();
    const honeypot = await POST(
      new Request("https://pay.sopmojo.com/api/lead/cpt-kit", {
        method: "POST",
        headers: { Origin: "https://preview.framer.app", "Content-Type": "application/json" },
        body: JSON.stringify({ name: "A", email: "a@example.com", company: "Bot" }),
      }),
    );
    expect(honeypot.status).toBe(200);
    expect(honeypot.headers.get("access-control-allow-origin")).toBe("https://preview.framer.app");
    const payload = await honeypot.json();
    expect(payload).toEqual({ ok: true });
    expect(JSON.stringify(payload)).not.toContain("http");
  });
});
