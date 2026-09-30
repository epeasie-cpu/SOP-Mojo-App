import { robotsTxt, textResponse } from "@/lib/discovery";

export const dynamic = "force-static";

export function GET() {
  return textResponse(robotsTxt(), "text/plain");
}
