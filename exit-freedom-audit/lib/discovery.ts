import { absolutePageUrl, FAQS, PAGES, SCORE_METRICS } from "./content";
import { AUDIENCE, SITE } from "./site";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function sitemapXml(): string {
  const urls = PAGES.map(
    (page) => `  <url>
    <loc>${escapeXml(absolutePageUrl(page.path))}</loc>
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

/** Major search and AI crawlers are allowed. Do not add Disallow rules for them. */
export function robotsTxt(): string {
  const bots = [
    "*",
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "anthropic-ai",
    "PerplexityBot",
    "Google-Extended",
    "Applebot",
    "Applebot-Extended",
    "Bingbot",
    "CCBot",
  ];
  const groups = bots
    .map(
      (bot) => `User-agent: ${bot}
Allow: /
`,
    )
    .join("\n");
  return `${groups}
Sitemap: ${SITE.host}/sitemap.xml
`;
}

export function llmsTxt(): string {
  const pages = PAGES.map(
    (page) => `- [${page.heading}](${absolutePageUrl(page.path)}): ${page.description}`,
  ).join("\n");
  return `# Exit / Freedom Readiness

> Free ops and exit readiness score for ${AUDIENCE}, from SOP Mojo.

## What it is

Exit / Freedom Readiness is SOP Mojo’s Ops Scalability Score: a free business operations audit. It scores whether a small or midsize company can keep running when the owner steps out.

## Who it is for

${AUDIENCE[0].toUpperCase()}${AUDIENCE.slice(1)}. Goals include an exit, time with family, a real stretch away, or less chaos in the current week.

## URL

${SITE.host}

## How it works

Answer 11 gut-check questions from memory (a goal, eight core questions, and two goal-specific add-ons). You get a 0–100 score, a band (Fragile, Building, or Ready), and the two gaps to fix first. Email unlocks six directional reads. Sellability is a directional band, not a valuation and not an industry multiple.

## CTA

Start the Audit: ${SITE.host}

## Pages

${pages}
`;
}

export function llmsFullTxt(): string {
  const metrics = SCORE_METRICS.map((metric) => `- **${metric.title}.** ${metric.text}`).join("\n");
  const faqs = FAQS.map((faq) => `### ${faq.question}\n\n${faq.answer}`).join("\n\n");
  return `${llmsTxt()}
## Entity

- Product: ${SITE.name} (${SITE.product})
- Company: ${SITE.parentName}
- Canonical URL: ${SITE.host}
- Parent site: ${SITE.parent}
- Audience: ${AUDIENCE}
- Price: free
- Writer: ${SITE.writer}
- Studio: ${SITE.studio}
- Builder: ${SITE.builder}

## Score bands

- 0–39: Fragile — key-person dependent
- 40–69: Building — not yet scalable
- 70–100: Ready — can run without you

## Directional reads after email

${metrics}

## FAQ

${faqs}

## Follow-up outside this app

Internal links from https://www.sopmojo.com (the Framer marketing site) are not part of this app. Add those links on sopmojo.com when the audit host is ready.
`;
}

export function textResponse(body: string, contentType: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": `${contentType}; charset=utf-8`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
