import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { proxy } from "@/proxy";
import { credentialSendKey, memoryEventStore } from "@/lib/event-store";
import { LEAD_MAGNET_TAG, POPUP_LEAD_TAG, QC_PACK_TAG, QMS_LEAD_TAG } from "@/lib/mailchimp";
import { headerLogoHref, hidesAccountHeaderLink } from "@/lib/lead-pages";
import { qcPackClaimKey, qcPackEmail, resetQcPackRateLimit, submitQcPack } from "@/lib/qc-pack";
import {
  QC_PACK_CHECK_URL,
  QC_PACK_FAQ,
  QC_PACK_PATH,
  QC_PACK_READY_PATH,
  QC_PACK_SEO_DESCRIPTION,
  QC_PACK_SEO_H1,
  QC_PACK_SEO_TITLE,
  qcPackFaqJsonLd,
  qcPackLandingMetadata,
} from "@/lib/qc-pack-page";
import { QMS_BUILDER_PRO_GO, QMS_CANONICAL_PATH } from "@/lib/qms-page";
import { QMS_STARTER_PACK_ENV, QMS_UPSELL } from "@/lib/qms-check";
import { isNoIndexPath, NOINDEX_HEADER } from "@/lib/robots";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID } from "@/lib/site";

const pack = "https://files.example/quality-control-starter-pack";

beforeEach(() => {
  resetQcPackRateLimit();
});

describe("Quality Control Starter Pack", () => {
  it("emails the pack once, tags Mailchimp, and refuses to send when the URL is unset", async () => {
    expect(QC_PACK_CHECK_URL).toBe(`https://pay.sopmojo.com${QMS_CANONICAL_PATH}`);
    expect(QC_PACK_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
    const letter = qcPackEmail(pack);
    expect(letter.subject).toBe("Your Quality Control Starter Pack");
    expect(letter.text).toContain(pack);
    expect(letter.text).toContain(QC_PACK_CHECK_URL);
    expect(letter.text).toContain(QMS_UPSELL);
    expect(letter.text).toContain(QMS_BUILDER_PRO_GO);
    expect(letter.html).toContain(`href="${pack}"`);

    const mail: { url: string; body: Record<string, unknown> | null }[] = [];
    const resend: { text?: string }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      if (url.includes("api.mailchimp.com")) mail.push({ url, body });
      if (url.includes("api.resend.com")) {
        resend.push(body as { text?: string });
        return Response.json({ id: "re_pack_1" });
      }
      return Response.json({ id: "ok" });
    };
    const env = {
      RESEND_API_KEY: "re_test",
      MAILCHIMP_API_KEY: "key-us21",
      MAILCHIMP_AUDIENCE_ID: "other-audience",
      [QMS_STARTER_PACK_ENV]: pack,
    } as unknown as NodeJS.ProcessEnv;
    const store = memoryEventStore();
    const input = {
      email: "Buyer@Example.com",
      name: "Ryan Pease",
      company: "",
      ip: "203.0.113.40",
      env,
      fetchImpl,
      store,
    };
    const logs: string[] = [];
    const infoSpy = vi.spyOn(console, "info").mockImplementation((message) => {
      logs.push(String(message));
    });
    expect(await submitQcPack(input)).toEqual({ ok: true });
    expect(await submitQcPack({ ...input, name: "Again" })).toEqual({ ok: true });
    expect(resend).toHaveLength(1);
    expect(resend[0]?.text).toContain(pack);
    expect(credentialSendKey(qcPackClaimKey("Buyer@Example.com"))).toBe("buyer@example.com|qc-pack");
    expect(mail.some((call) => call.url.includes(DEFAULT_MAILCHIMP_AUDIENCE_ID))).toBe(true);
    expect(mail.some((call) => call.url.includes("other-audience"))).toBe(false);
    const tagged = mail.find((call) => call.url.endsWith("/tags"));
    expect(tagged?.body).toEqual({
      tags: [
        { name: QMS_LEAD_TAG, status: "active" },
        { name: LEAD_MAGNET_TAG, status: "active" },
        { name: QC_PACK_TAG, status: "active" },
      ],
    });
    expect(JSON.stringify(tagged?.body)).not.toContain(POPUP_LEAD_TAG);
    expect(logs.join("\n")).toContain('"id":"re_pack_1"');
    expect(logs.join("\n")).not.toContain("buyer");
    infoSpy.mockRestore();

    const popupMail: { body: Record<string, unknown> | null }[] = [];
    expect(
      await submitQcPack({
        ...input,
        email: "popup@example.com",
        popup: true,
        ip: "203.0.113.41",
        store: memoryEventStore(),
        fetchImpl: async (inputUrl, init) => {
          const url = String(inputUrl);
          const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
          if (url.endsWith("/tags")) popupMail.push({ body });
          if (url.includes("api.resend.com")) return Response.json({ id: "re_popup" });
          return Response.json({});
        },
      }),
    ).toEqual({ ok: true });
    expect(popupMail[0]?.body).toEqual({
      tags: [
        { name: QMS_LEAD_TAG, status: "active" },
        { name: LEAD_MAGNET_TAG, status: "active" },
        { name: QC_PACK_TAG, status: "active" },
        { name: POPUP_LEAD_TAG, status: "active" },
      ],
    });

    const errors: string[] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation((message) => {
      errors.push(String(message));
    });
    let calls = 0;
    expect(
      await submitQcPack({
        ...input,
        email: "missing@example.com",
        ip: "203.0.113.42",
        env: { RESEND_API_KEY: "re_test" } as unknown as NodeJS.ProcessEnv,
        store: memoryEventStore(),
        fetchImpl: async () => {
          calls += 1;
          return Response.json({});
        },
      }),
    ).toEqual({ ok: false, code: "send" });
    expect(calls).toBe(0);
    expect(errors.join("\n")).toContain('"reason":"unset"');
    expect(errors.join("\n")).not.toContain("missing@");
    errorSpy.mockRestore();

    expect(await submitQcPack({ ...input, company: "Acme", store: memoryEventStore(), fetchImpl: async () => {
      throw new Error("honeypot");
    } })).toEqual({ ok: true });
    expect(await submitQcPack({ ...input, email: "nope", store: memoryEventStore() })).toEqual({ ok: false, code: "email" });
    expect(await submitQcPack({ ...input, name: " ", store: memoryEventStore() })).toEqual({ ok: false, code: "name" });
  });

  it("publishes the pack page, keeps the file link out of the HTML, and noindexes the ready page", async () => {
    expect(QC_PACK_SEO_TITLE).toBe("Free Quality Control Starter Pack | SOP Mojo");
    expect(QC_PACK_SEO_H1).toBe("Quality Control Starter Pack");
    const meta = qcPackLandingMetadata();
    expect(meta.alternates).toEqual({ canonical: `https://pay.sopmojo.com${QC_PACK_PATH}` });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(qcPackFaqJsonLd()["@type"]).toBe("FAQPage");
    expect(QC_PACK_FAQ).toHaveLength(5);

    const listed = await (await sitemap()).text();
    expect(listed).toContain(`https://pay.sopmojo.com${QC_PACK_PATH}`);
    expect(listed).not.toContain(QC_PACK_READY_PATH);
    const robotsBody = await (await robots()).text();
    expect(robotsBody).toContain(`Allow: ${QC_PACK_PATH}`);
    expect(isNoIndexPath(QC_PACK_PATH)).toBe(false);
    expect(isNoIndexPath(QC_PACK_READY_PATH)).toBe(true);
    const ready = proxy(new NextRequest(`https://pay.sopmojo.com${QC_PACK_READY_PATH}`));
    expect(ready.headers.get("x-robots-tag")).toBe(NOINDEX_HEADER);

    const landing = readFileSync(path.join(process.cwd(), "components/QcPackLanding.tsx"), "utf8");
    const copy = readFileSync(path.join(process.cwd(), "lib/qc-pack-page.ts"), "utf8");
    const readyPage = readFileSync(path.join(process.cwd(), "app/quality-control-starter-pack/ready/page.tsx"), "utf8");
    expect(copy).toContain("00");
    expect(copy).toContain("START HERE");
    expect(copy).toContain("Inspection Checklist");
    expect(copy).toContain("Nonconformance & CAPA Log");
    expect(copy).toContain("Quality KPI Tracker");
    expect(copy).toContain("SOP Review Log");
    expect(landing).toContain("QC_PACK_FILES");
    expect(landing).toContain('name="name"');
    expect(landing).toContain('name="email"');
    expect(landing).toContain('name="company"');
    expect(landing).not.toMatch(/testimonial|case study|SamCart|docs\.google|QMS_STARTER_PACK_URL/i);
    expect(readyPage).not.toContain("QMS_STARTER_PACK_URL");
    expect(readyPage).toContain("QC_PACK_CHECK_URL");
    expect(readyPage).toContain("QMS_BUILDER_PRO_GO");
    expect(hidesAccountHeaderLink(QC_PACK_PATH)).toBe(true);
    expect(headerLogoHref(QC_PACK_READY_PATH)).toBe("https://www.sopmojo.com");
  });
});
