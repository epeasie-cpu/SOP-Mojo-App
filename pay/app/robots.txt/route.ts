import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const body = `User-agent: *
Allow: /
Allow: /acceptable-use-policy-generator
Allow: /free/aup-generator
Allow: /business-os-blueprint
Allow: /high-converting-offers-guide
Allow: /escape-the-founder-trap
Disallow: /checkout
Disallow: /download
Disallow: /go
Disallow: /admin
Disallow: /account
Disallow: /api

Sitemap: ${SITE.host}/sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
