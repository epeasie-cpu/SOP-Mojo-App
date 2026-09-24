import { SITE, absoluteUrl } from "./site";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const PAGES = [
  { path: "/", lastmod: "2026-09-19", changefreq: "weekly", priority: 1 },
  { path: "/how-it-works", lastmod: "2026-09-19", changefreq: "monthly", priority: 0.7 },
] as const;

export function sitemapXml(): string {
  const urls = PAGES.map(
    (page) => `  <url>
    <loc>${escapeXml(absoluteUrl(page.path))}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function robotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${SITE.host}/sitemap.xml
`;
}

export function llmsTxt(): string {
  return `# ${SITE.name}

> ${SITE.tagline}

Canonical host: ${SITE.host}
Parent: ${SITE.parent}
Living system: ${SITE.builder}

## Product
- Free: create and iterate a process flowchart from text, voice, or a photo of handwriting.
- Builder Pro $39/mo: includes print, PNG/JSON export, and export to Builder Pro.
- Optional $19 unlock: print/export/import without a Builder Pro subscription.

## Pages
- ${absoluteUrl("/")} — studio (handwriting to flowchart, AI process map)
- ${absoluteUrl("/how-it-works")} — how capture, canvas, chat, and Builder export work
`;
}

export function xmlResponse(body: string, contentType = "application/xml"): Response {
  return new Response(body, {
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
