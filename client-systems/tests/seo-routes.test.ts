import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { GET as sitemapPages } from "@/app/sitemap-pages.xml/route";
import { GET as contentTree } from "@/app/content-tree.xml/route";
import { GET as llms } from "@/app/llms.txt/route";
import {
  CONTENT,
  PHASE_TWO_PATHS,
  REQUIRED_MARKETING_PATHS,
} from "@/lib/content";
import { jsonLdGraph } from "@/lib/jsonld";
import { pageTitle } from "@/lib/seo";
import {
  SITE,
  kitCheckoutIsLive,
  kitCheckoutUrl,
} from "@/lib/site";
import nextConfig from "../next.config";

async function read(response: Response) {
  return {
    status: response.status,
    body: await response.text(),
    type: response.headers.get("content-type") ?? "",
  };
}

function graphTypes(path: string) {
  const entry = CONTENT.find((item) => item.path === path);
  if (!entry) throw new Error(`missing content: ${path}`);
  return (jsonLdGraph(entry)["@graph"] as Array<{ "@type": string }>).map(
    (node) => node["@type"],
  );
}

function pageFileFor(path: string) {
  if (path === "/") return join(process.cwd(), "app/page.tsx");
  return join(process.cwd(), `app${path}/page.tsx`);
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
    expect(body).not.toContain(`${SITE.host}/pricing`);
    expect(body).not.toContain(`${SITE.host}/agency-client-onboarding`);
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
    expect(body.toLowerCase()).toMatch(/not a notion/);
    expect(body.toLowerCase()).toMatch(/proposal/);
    expect(body).toContain("$39");
  });
});

describe("content registry", () => {
  it("drives every required marketing route and matching page file", () => {
    const paths = new Set(CONTENT.map((entry) => entry.path));
    for (const path of REQUIRED_MARKETING_PATHS) {
      expect(paths.has(path)).toBe(true);
      expect(existsSync(pageFileFor(path))).toBe(true);
    }
  });

  it("does not register or ship phase-two / retired slugs", () => {
    const paths = new Set(CONTENT.map((entry) => entry.path));
    for (const path of PHASE_TWO_PATHS) {
      expect(paths.has(path)).toBe(false);
      expect(existsSync(pageFileFor(path))).toBe(false);
    }
  });

  it("uses the Client Systems title pattern", () => {
    for (const entry of CONTENT) {
      expect(pageTitle(entry.keyword)).toBe(
        `${entry.keyword} | Client Systems | SOP Mojo`,
      );
    }
  });

  it("positions the product as the path after yes, not Writer, Notion, or ClickUp", () => {
    const home = CONTENT.find((entry) => entry.path === "/");
    const blob = [
      home?.description,
      home?.lede,
      ...(home?.sections ?? []).flatMap((section) => section.body),
    ].join(" ");
    expect(blob).toMatch(/not Notion/i);
    expect(blob).toMatch(/not ClickUp/i);
    expect(blob).toMatch(/not SOP Writer/i);
    expect(blob).toMatch(/proposal/i);
    expect(blob).toMatch(/welcome/i);
    expect(blob).toMatch(/onboard/i);
  });

  it("states kit price as $39 on /client-systems-kit without fake subscription claims", () => {
    const kit = CONTENT.find((entry) => entry.path === "/client-systems-kit");
    const blob = [
      kit?.description,
      kit?.lede,
      ...(kit?.sections ?? []).flatMap((section) => section.body),
    ].join(" ");
    expect(blob).toContain("$39");
    expect(blob).not.toMatch(/unlimited seats/i);
    expect(blob).not.toMatch(/free forever/i);
    expect(blob).not.toMatch(/50% off/i);
  });

  it("puts the landing CTA pattern on every marketing page", () => {
    const src = readFileSync(join(process.cwd(), "components/CtaRow.tsx"), "utf8");
    expect(src).toContain("Start free in Client Systems");
    expect(src).toContain("Get the $39 Kit");
    expect(src).toContain("AI SOP Writer");
    expect(src).toContain("SOP Builder Pro");
    expect(src).toContain("href=\"/signup\"");
    expect(src).toContain("kitCheckoutUrl()");
  });
});

describe("JSON-LD", () => {
  it("emits Organization, WebSite, SoftwareApplication, and BreadcrumbList on home", () => {
    const types = graphTypes("/");
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("SoftwareApplication");
    expect(types).toContain("BreadcrumbList");
    expect(types).not.toContain("FAQPage");
    expect(types).not.toContain("Product");
  });

  it("emits FAQPage, HowTo, and BreadcrumbList on the checklist", () => {
    const types = graphTypes("/client-onboarding-checklist");
    expect(types).toContain("FAQPage");
    expect(types).toContain("HowTo");
    expect(types).toContain("BreadcrumbList");
  });

  it("emits FAQPage on /faq and BreadcrumbList on every indexed page", () => {
    expect(graphTypes("/faq")).toContain("FAQPage");
    for (const entry of CONTENT.filter((item) => item.index)) {
      expect(graphTypes(entry.path)).toContain("BreadcrumbList");
    }
  });

  it("omits Product on the kit until checkout is live", () => {
    const previous = process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL;
    delete process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL;
    expect(kitCheckoutUrl()).toBe("#");
    expect(kitCheckoutIsLive()).toBe(false);
    expect(graphTypes("/client-systems-kit")).not.toContain("Product");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL;
    else process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL = previous;
  });
});

describe("kit checkout", () => {
  const previous = process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL;

  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL;
    else process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL = previous;
  });

  it("emits Product+Offer on /client-systems-kit when checkout URL is set", () => {
    process.env.NEXT_PUBLIC_KIT_CHECKOUT_URL = "https://buy.example/kit";
    expect(kitCheckoutIsLive()).toBe(true);
    const entry = CONTENT.find((item) => item.path === "/client-systems-kit")!;
    const graph = jsonLdGraph(entry)["@graph"] as Array<{
      "@type": string;
      offers?: { "@type": string; price: string; url: string };
    }>;
    const product = graph.find((node) => node["@type"] === "Product");
    expect(product).toBeTruthy();
    expect(product?.offers).toMatchObject({
      "@type": "Offer",
      price: "39",
      url: "https://buy.example/kit",
    });
  });
});

describe("retired slug redirects", () => {
  it("merges /pricing into /client-systems-kit and /agency-client-onboarding into /client-onboarding", async () => {
    const redirects = nextConfig.redirects
      ? await nextConfig.redirects()
      : [];
    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/pricing",
          destination: "/client-systems-kit",
          permanent: true,
        }),
        expect.objectContaining({
          source: "/agency-client-onboarding",
          destination: "/client-onboarding",
          permanent: true,
        }),
      ]),
    );
  });
});
