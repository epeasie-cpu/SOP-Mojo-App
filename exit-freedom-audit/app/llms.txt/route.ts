import { llmsTxt, textResponse } from "@/lib/discovery";

export const dynamic = "force-static";

export function GET() {
  return textResponse(llmsTxt(), "text/plain");
}
