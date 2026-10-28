import { NextResponse } from "next/server";
import { clientIpFromHeaders } from "@/lib/aup-free";
import { performUnsubscribe } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await performUnsubscribe({
    token,
    ip: clientIpFromHeaders(request.headers),
    env: process.env,
  });
  if (result === "invalid") return NextResponse.json({ ok: false }, { status: 400 });
  if (result === "rate") return NextResponse.json({ ok: false }, { status: 429 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

export function GET(request: Request) {
  const current = new URL(request.url);
  const next = new URL("/unsubscribe", current.origin);
  const token = current.searchParams.get("token");
  if (token) next.searchParams.set("token", token);
  return NextResponse.redirect(next);
}
