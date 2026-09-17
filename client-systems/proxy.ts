import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE);
  if (pathname.startsWith("/app") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if ((pathname === "/login" || pathname === "/signup") && session) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
