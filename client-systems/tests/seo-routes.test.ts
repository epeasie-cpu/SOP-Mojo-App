import { describe, expect, it } from "vitest";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { GET as sitemapPages } from "@/app/sitemap-pages.xml/route";
import { GET as contentTree } from "@/app/content-tree.xml/route";
import { GET as llms } from "@/app/llms.txt/route";
import { CONTENT, REQUIRED_MARKETING_PATHS } from "@/lib/content";
import { jsonLdGraph } from "@/lib/jsonld";
import { pageTitle } from "@/lib/seo";
import { SITE } from "@/lib/site";

async function read(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    type: response.headers.get("content-type") ?? "",
  };
}

describe("SEO routes", () => {
  it("sitemap.xml is an index pointing at clients.sopmojo.com", async () => {
    const { status, body, type } = await read(sitemap());
    expect(status).toBe(200);
    expect(type).toContain("application/xml");
    expect(body).toContain("https://clients.sopmojo.com/sitemap-pages.xml");
    expect(body).toContain("<sitemapindex");
  });

  it("robots.txt allows crawlers and lists the canonical sitemap", async () => {
    const { status, body, type } = await read(robots());
    expect(status).toBe(200);
    expect(type).toContain("text/plain");
    expect(body).toContain("Sitemap: https://clients.sopmojo.com/sitemap.xml");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /app");
  });

  it("sitemap-pages.xml includes loc, lastmod, changefreq, priority for marketing pages", async () => {
    const { status, body } = await read(sitemapPages());
    expect(status).toBe(200);
    expect(body).toContain("<lastmod>");
    expect(body).toContain("<changefreq>");
    expect(body).toContain("<priority>");
    for (const path of REQUIRED_MARKETING_PATHS) {
      const loc = path === "/" ? SITE.host : `${SITE.host}${path}`;
      expect(body).toContain(`<loc>${loc}</loc>`);
    }
    expect(body).not.toContain(`${SITE.host}/app`);
  });

  it("content-tree.xml is scrapable from the registry", async () => {
    const { status, body } = await read(contentTree());
    expect(status).toBe(200);
    expect(body).toContain("<loc>");
    expect(body).toContain("<title>");
    expect(body).toContain("<description>");
    expect(body).toContain("<type>");
    expect(body).toContain("<parent>");
    expect(body).toContain("<lastmod>");
    for (const path of REQUIRED_MARKETING_PATHS) {
      const loc = path === "/" ? SITE.host : `${SITE.host}${path}`;
      expect(body).toContain(`<loc>${loc}</loc>`);
    }
  });

  it("llms.txt names Client Systems and related hosts", async () => {
    const { status, body } = await read(llms());
    expect(status).toBe(200);
    expect(body).toContain("Client Systems");
    expect(body).toContain(SITE.host);
    expect(body).toContain(SITE.writer);
    expect(body).toContain(SITE.builder);
    expect(body).toContain(SITE.library);
    expect(body).toContain("not a Notion template marketplace");
  });
});

describe("content registry", () => {
  it("drives every required marketing route", () => {
    const paths = new Set(CONTENT.map((entry) => entry.path));
    for (const path of REQUIRED_MARKETING_PATHS) {
      expect(paths.has(path)).toBe(true);
    }
  });

  it("uses the Client Systems title pattern", () => {
    for (const entry of CONTENT) {
      expect(pageTitle(entry.keyword)).toBe(
        `${entry.keyword} | Client Systems | SOP Mojo`,
      );
    }
  });

  it("positions the product as onboarding systems, not Notion or ClickUp", () => {
    const home = CONTENT.find((entry) => entry.path === "/");
    const blob = [
      home?.description,
      home?.lede,
      ...(home?.sections ?? []).flatMap((section) => section.body),
    ].join(" ");
    expect(blob).toMatch(/not Notion/i);
    expect(blob).toMatch(/not ClickUp/i);
    expect(blob).toMatch(/client onboarding/i);
  });

  it("states kit price as $39 without fake subscription claims", () => {
    const pricing = CONTENT.find((entry) => entry.path === "/pricing");
    const blob = [
      pricing?.description,
      pricing?.lede,
      ...(pricing?.sections ?? []).flatMap((section) => section.body),
    ].join(" ");
    expect(blob).toContain("$39");
    expect(blob).not.toMatch(/unlimited seats/i);
    expect(blob).not.toMatch(/free forever/i);
    expect(blob).not.toMatch(/50% off/i);
  });
});

describe("JSON-LD", () => {
  it("emits Organization, SoftwareApplication, and FAQPage on the home graph", () => {
    const home = CONTENT.find((entry) => entry.path === "/")!;
    const graph = jsonLdGraph(home);
    const types = (graph["@graph"] as Array<{ "@type": string }>).map((node) => node["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("SoftwareApplication");
    expect(types).toContain("FAQPage");
  });

  it("emits HowTo and BreadcrumbList on how-it-works", () => {
    const page = CONTENT.find((entry) => entry.path === "/how-it-works")!;
    const graph = jsonLdGraph(page);
    const types = (graph["@graph"] as Array<{ "@type": string }>).map((node) => node["@type"]);
    expect(types).toContain("HowTo");
    expect(types).toContain("BreadcrumbList");
  });
});
