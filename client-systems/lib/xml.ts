import { CONTENT, pagesForSitemap, type ContentEntry } from "./content";
import { BUILDER_CTA_URL, SITE, WRITER_CTA_URL, absoluteUrl } from "./site";

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
  const lastmod = CONTENT.reduce(
    (max, entry) => (entry.lastmod > max ? entry.lastmod : max),
    LASTMOD_FALLBACK,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(`${SITE.host}/sitemap-pages.xml`)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>
`;
}

export function sitemapPagesXml(): string {
  return urlset(pagesForSitemap());
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
Disallow: /app
Disallow: /login
Disallow: /signup
Disallow: /api

Sitemap: ${SITE.host}/sitemap.xml
`;
}

export function llmsTxt(): string {
  const pages = CONTENT.filter((entry) => entry.index)
    .map((entry) => `- [${entry.heading}](${absoluteUrl(entry.path)}): ${entry.description}`)
    .join("\n");
  return `# Client Systems

> ${SITE.tagline}

- Canonical host: ${SITE.host}
- Parent: ${SITE.parent}
- AI SOP Writer: ${WRITER_CTA_URL}
- SOP Builder Pro: ${SITE.builder}
- Builder Pro checkout: ${BUILDER_CTA_URL}
- SOP Library: ${SITE.library}
- Founder contact: ${SITE.founderEmail}

## Product name

Use **Client Systems** in the UI and citations. It is the client path after yes: proposal → welcome → onboard. The Client Systems Kit is $39. This workspace is where you run the kit. It is not AI SOP Writer and not a Notion or ClickUp template marketplace.

## What it does

Client Systems runs the engagement after the buyer says yes: intake, sales-to-delivery handoff, a copyable welcome draft, access SLAs, and a 31-task board seeded when both leads confirm. App routes under /app are noindex.

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
