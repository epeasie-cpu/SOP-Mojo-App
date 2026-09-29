import { describe, expect, it } from "vitest";
import { GET as llmsFull } from "@/app/llms-full.txt/route";
import { GET as llms } from "@/app/llms.txt/route";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { FAQS, HOME_SECTIONS, PAGES, TARGET_KEYWORDS } from "@/lib/content";
import { jsonLdGraph } from "@/lib/jsonld";
import { documentTitle } from "@/lib/seo";
import { SITE } from "@/lib/site";

async function read(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    type: response.headers.get("content-type") ?? "",
  };
}

describe("audit discovery files", () => {
  it("publishes a sitemap of the indexable pages on the canonical host", async () => {
    const { status, body, type } = await read(sitemap());
    expect(status).toBe(200);
    expect(type).toContain("application/xml");
    for (const page of PAGES) {
      const loc = page.path === "/" ? SITE.host : `${SITE.host}${page.path}`;
      expect(body).toContain(`<loc>${loc}</loc>`);
      expect(body).toContain("<lastmod>");
      expect(body).toContain("<changefreq>");
      expect(body).toContain("<priority>");
    }
    expect(body).not.toContain("/quiz");
  });

  it("allows search and AI crawlers", async () => {
    const { status, body, type } = await read(robots());
    expect(status).toBe(200);
    expect(type).toContain("text/plain");
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Sitemap: https://audit.sopmojo.com/sitemap.xml");
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "Bingbot"]) {
      expect(body).toContain(`User-agent: ${bot}`);
    }
    expect(body.toLowerCase()).not.toContain("disallow");
  });

  it("describes the product for agents in llms.txt and llms-full.txt", async () => {
    const short = await read(llms());
    const full = await read(llmsFull());
    expect(short.status).toBe(200);
    expect(full.status).toBe(200);
    for (const body of [short.body, full.body]) {
      expect(body).toContain("https://audit.sopmojo.com");
      expect(body).toContain("SOP Mojo");
      expect(body).toContain("ops managers, team leads");
      expect(body).not.toMatch(/CEO|COO/);
      expect(body).toContain("## How it works");
      expect(body).toContain("## CTA");
      expect(body).not.toMatch(/\d+(\.\d+)?\s*[x×]/i);
    }
    expect(full.body).toContain("## FAQ");
    expect(full.body).toContain("Sellability");
    expect(full.body).toContain("AI implementation readiness");
    expect(full.body).toContain("sopmojo.com (the Framer marketing site)");
  });

  it("gives each indexable page a unique title and FAQ answers agents can cite", () => {
    const titles = PAGES.map((page) => documentTitle(page));
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles[0]).toContain("audit.sopmojo.com".replace("audit.sopmojo.com", "SOP Mojo"));
    for (const keyword of ["business operations audit", "exit readiness", "ops scalability", "AI readiness for SMBs"]) {
      expect(TARGET_KEYWORDS).toContain(keyword);
    }
    expect(HOME_SECTIONS.map((section) => section.heading)).toEqual([
      "Business operations audit",
      "Exit readiness",
      "Ops scalability",
      "AI readiness for SMBs",
    ]);
    const faq = jsonLdGraph(PAGES[2]);
    const graph = faq["@graph"] as { "@type": string }[];
    expect(graph.some((node) => node["@type"] === "WebApplication")).toBe(true);
    expect(graph.some((node) => node["@type"] === "Organization")).toBe(true);
    expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
    const home = JSON.stringify(jsonLdGraph(PAGES[0]));
    expect(home).toContain("WebApplication");
    expect(home).not.toContain("FAQPage");
    expect(FAQS.length).toBeGreaterThanOrEqual(6);
    expect(FAQS.map((item) => item.answer).join("\n")).toMatch(/not a valuation/i);
  });
});
