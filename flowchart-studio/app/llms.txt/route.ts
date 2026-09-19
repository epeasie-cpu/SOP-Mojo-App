import { llmsTxt, xmlResponse } from "@/lib/xml";

export const dynamic = "force-static";

export function GET() {
  return xmlResponse(llmsTxt(), "text/plain");
}
