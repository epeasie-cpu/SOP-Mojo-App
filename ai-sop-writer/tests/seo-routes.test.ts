import { describe, expect, it } from "vitest";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { GET as sitemapPages } from "@/app/sitemap-pages.xml/route";
import { GET as sitemapUseCases } from "@/app/sitemap-use-cases.xml/route";
import { GET as contentTree } from "@/app/content-tree.xml/route";
import { GET as llms } from "@/app/llms.txt/route";
import { CONTENT } from "@/lib/content";
import { SITE } from "@/lib/site";
import { generateTemplateSop } from "@/lib/template-engine";

const REQUIRED_PATHS = [
  "/",
  "/how-it-works",
  "/ai-sop-generator",
  "/sop-template",
  "/how-to-write-an-sop",
  "/use-cases/client-onboarding",
  "/use-cases/sales",
  "/use-cases/employee-onboarding",
  "/use-cases/housekeeping",
  "/use-cases/trades",
  "/use-cases/process-documentation",
  "/faq",
  "/vs/sop-builder-pro",
];

async function read(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    type: response.headers.get("content-type") ?? "",
  };
}

describe("SEO routes", () => {
  it("sitemap.xml returns 200 with writer.sopmojo.com URLs", async () => {
    const { status, body, type } = await read(sitemap());
    expect(status).toBe(200);
    expect(type).toContain("application/xml");
    expect(body).toContain("https://writer.sopmojo.com/sitemap-pages.xml");
    expect(body).toContain("https://writer.sopmojo.com/sitemap-use-cases.xml");
    expect(body).toContain("<lastmod>");
  });

  it("content-tree.xml returns 200 with writer.sopmojo.com URLs", async () => {
    const { status, body } = await read(contentTree());
    expect(status).toBe(200);
    expect(body).toContain("https://writer.sopmojo.com");
    expect(body).toContain("<loc>");
    expect(body).toContain("<title>");
    expect(body).toContain("<description>");
    expect(body).toContain("<type>");
    expect(body).toContain("<parent>");
    expect(body).toContain("<lastmod>");
    for (const path of REQUIRED_PATHS) {
      const loc =
        path === "/"
          ? "https://writer.sopmojo.com"
          : `https://writer.sopmojo.com${path}`;
      expect(body).toContain(`<loc>${loc}</loc>`);
    }
  });

  it("robots.txt returns 200 with writer.sopmojo.com sitemap", async () => {
    const { status, body, type } = await read(robots());
    expect(status).toBe(200);
    expect(type).toContain("text/plain");
    expect(body).toContain("Sitemap: https://writer.sopmojo.com/sitemap.xml");
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
  });

  it("sitemap-pages.xml and sitemap-use-cases.xml include loc, lastmod, changefreq, priority", async () => {
    const pages = await read(sitemapPages());
    const uses = await read(sitemapUseCases());
    expect(pages.status).toBe(200);
    expect(uses.status).toBe(200);
    for (const body of [pages.body, uses.body]) {
      expect(body).toContain("<loc>https://writer.sopmojo.com");
      expect(body).toContain("<lastmod>");
      expect(body).toContain("<changefreq>");
      expect(body).toContain("<priority>");
    }
    expect(pages.body).toContain("https://writer.sopmojo.com/how-it-works");
    expect(uses.body).toContain("https://writer.sopmojo.com/use-cases/trades");
  });

  it("llms.txt names AI SOP Writer and the canonical host", async () => {
    const { status, body } = await read(llms());
    expect(status).toBe(200);
    expect(body).toContain("AI SOP Writer");
    expect(body).toContain(SITE.host);
    expect(body).toContain("standard operating procedure");
  });
});

describe("content registry", () => {
  it("drives every required marketing route", () => {
    const paths = new Set(CONTENT.map((entry) => entry.path));
    for (const path of REQUIRED_PATHS) {
      expect(paths.has(path)).toBe(true);
    }
  });

  it("does not advertise local email capture or an email service provider", () => {
    const forbidden =
      /email service provider|optional email capture|logged on this server|save your email locally/i;
    for (const entry of CONTENT) {
      expect(entry.description).not.toMatch(forbidden);
      expect(entry.lede ?? "").not.toMatch(forbidden);
      for (const faq of entry.faqs ?? []) {
        expect(faq.question).not.toMatch(forbidden);
        expect(faq.answer).not.toMatch(forbidden);
      }
      for (const section of entry.sections ?? []) {
        expect(section.heading).not.toMatch(forbidden);
        for (const body of section.body) {
          expect(body).not.toMatch(forbidden);
        }
      }
    }
  });

  it("documents free generate and export without an email gate", () => {
    const faq = CONTENT.find((entry) => entry.path === "/faq")
      ?.faqs?.find((item) => /copy, print, or download/i.test(item.question));
    expect(faq?.answer).toMatch(/copy the Markdown/i);
    expect(faq?.answer).toMatch(/AI prompt/i);
    expect(faq?.answer).toMatch(/no email gate/i);
  });
});

describe("template engine", () => {
  it("returns every SOP section", () => {
    const sop = generateTemplateSop({
      businessType: "Residential and light-commercial trades",
      processName: "On-site service job from arrival to close-out",
      role: "Lead technician",
      tools: "Work-order app, PPE",
      kpi: "First-time fix rate",
      trigger: "Dispatched work order",
    });
    expect(sop.purpose).toMatch(/standard operating procedure/i);
    expect(sop.owner).toBe("Lead technician");
    expect(sop.trigger).toContain("Dispatched");
    expect(sop.tools.length).toBeGreaterThan(0);
    expect(sop.kpi).toMatch(/First-time fix/);
    expect(sop.steps.length).toBeGreaterThanOrEqual(6);
    expect(sop.exceptions.length).toBeGreaterThan(0);
    expect(sop.checklist.length).toBeGreaterThan(0);
    expect(sop.safetyNotes.length).toBeGreaterThan(0);
  });
});
