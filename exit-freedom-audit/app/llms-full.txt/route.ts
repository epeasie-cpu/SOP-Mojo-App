import { llmsFullTxt, textResponse } from "@/lib/discovery";

export const dynamic = "force-static";

export function GET() {
  return textResponse(llmsFullTxt(), "text/plain");
}
