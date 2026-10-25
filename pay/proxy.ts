import { NextRequest, NextResponse } from "next/server";
import { embedFramePolicy, isEmbedCheckout } from "@/lib/embed-frame";
import { isNoIndexPath, NOINDEX_HEADER } from "@/lib/robots";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (isNoIndexPath(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", NOINDEX_HEADER);
  }
  if (isEmbedCheckout(request.nextUrl)) {
    response.headers.delete("X-Frame-Options");
    response.headers.set("Content-Security-Policy", embedFramePolicy());
  }
  return response;
}

export const config = {
  matcher: [
    "/checkout/:path*",
    "/go/:path*",
    "/admin/:path*",
    "/account/:path*",
    "/api/:path*",
    "/download/:path*",
    "/free/aup-generator/ready",
    "/free/qms-check/ready",
    "/escape-the-founder-trap/ready",
  ],
};
