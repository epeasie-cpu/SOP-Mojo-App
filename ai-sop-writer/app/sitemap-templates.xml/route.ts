import { sitemapTemplatesXml, xmlResponse } from "@/lib/xml";

export const dynamic = "force-static";

export function GET() {
  return xmlResponse(sitemapTemplatesXml());
}
