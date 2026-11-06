import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, readMagicLink, signSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const magic = readMagicLink(token);
  if (!magic) {
    return NextResponse.redirect(new URL("/admin/login?error=link", request.url));
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signSession(magic.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.redirect(new URL("/admin", request.url));
}
