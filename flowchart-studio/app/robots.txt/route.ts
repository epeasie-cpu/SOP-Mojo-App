import { robotsTxt, xmlResponse } from "@/lib/xml";

export const dynamic = "force-static";

export function GET() {
  return xmlResponse(robotsTxt(), "text/plain");
}
