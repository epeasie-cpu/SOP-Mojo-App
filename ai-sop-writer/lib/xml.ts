import {
  CONTENT,
  pagesForSitemap,
  getUseCaseSitemapEntries,
  type ContentEntry,
} from "./content";
import { SITE, WRITER_UPGRADE_URL, absoluteUrl } from "./site";

const LASTMOD_FALLBACK = "2026-09-17";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlset(entries: ContentEntry[]): string {
  const urls = entries
    .map((entry) => {
      return `  <url>
    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function sitemapIndexXml(): string {
  const lastmod = CONTENT.reduce((max, entry) =>
    entry.lastmod > max ? entry.lastmod : max,
  LASTMOD_FALLBACK);
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(`${SITE.host}/sitemap-pages.xml`)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(`${SITE.host}/sitemap-use-cases.xml`)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>
`;
}

export function sitemapPagesXml(): string {
  return urlset(pagesForSitemap());
}

export function sitemapUseCasesXml(): string {
  return urlset(getUseCaseSitemapEntries());
}

export function contentTreeXml(): string {
  const items = CONTENT.map((entry) => {
    const parent = entry.parent ? absoluteUrl(entry.parent) : "";
    return `  <item>
    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>
    <title>${escapeXml(entry.heading)}</title>
    <description>${escapeXml(entry.description)}</description>
    <type>${escapeXml(entry.type)}</type>
    <parent>${escapeXml(parent)}</parent>
    <lastmod>${entry.lastmod}</lastmod>
  </item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<content-tree>
${items}
</content-tree>
`;
}

export function robotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${SITE.host}/sitemap.xml
`;
}

export function llmsTxt(): string {
  const pages = CONTENT.filter((entry) => entry.index)
    .map((entry) => `- [${entry.heading}](${absoluteUrl(entry.path)}): ${entry.description}`)
    .join("\n");
  return `# AI SOP Writer

> ${SITE.tagline} SOP means standard operating procedure, not statement of purpose.

- Canonical host: ${SITE.host}
- Parent: ${SITE.parent}
- Upgrade / Builder Pro: ${WRITER_UPGRADE_URL}
- Living system: ${SITE.builder}
- SOP Library: ${SITE.library}
- Founder contact: ${SITE.founderEmail}

## Product name

Use **AI SOP Writer** in the UI and citations. Do not call this product Draft Engine, SOP Builder, or SOP Generator.

## What it does

AI SOP Writer writes a first-draft standard operating procedure from business type, process name, role, and optional tools, KPI, and trigger. Every draft includes purpose, owner, trigger, tools, KPI, steps, exceptions, checklist, and safety notes. Review with the process owner before training anyone, then move the approved SOP into SOP Builder Pro.

## Pages

${pages}
`;
}

export function xmlResponse(body: string, contentType = "application/xml"): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
