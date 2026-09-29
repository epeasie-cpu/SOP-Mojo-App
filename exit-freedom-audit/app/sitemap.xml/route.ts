import { sitemapXml, textResponse } from "@/lib/discovery";

export const dynamic = "force-static";

export function GET() {
  return textResponse(sitemapXml(), "application/xml");
}
