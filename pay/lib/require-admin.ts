import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, readSession } from "@/lib/admin-session";

export async function requireAdmin(): Promise<{ email: string } | NextResponse> {
  const jar = await cookies();
  const session = readSession(jar.get(ADMIN_COOKIE)?.value, process.env);
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return session;
}

export function isResponse(value: { email: string } | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
