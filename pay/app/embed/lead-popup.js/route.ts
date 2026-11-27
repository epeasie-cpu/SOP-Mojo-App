import { leadPopupScript } from "@/lib/lead-popup";

export function GET() {
  return new Response(leadPopupScript(), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
