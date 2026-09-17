import { SITE, absoluteUrl } from "./site";

const LASTMOD = "2026-09-17";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sitemapXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(absoluteUrl("/"))}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
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

export function xmlResponse(body: string, contentType = "application/xml"): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
