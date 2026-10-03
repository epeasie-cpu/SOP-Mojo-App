import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /checkout
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
