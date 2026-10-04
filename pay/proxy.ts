import { NextRequest, NextResponse } from "next/server";
import { isNoIndexPath, NOINDEX_HEADER } from "@/lib/robots";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (isNoIndexPath(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", NOINDEX_HEADER);
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
  ],
};
