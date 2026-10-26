import { NextResponse } from "next/server";
import { clientIpFromHeaders } from "@/lib/aup-free";
import { leadPopupAllowedOrigin } from "@/lib/lead-popup";
import { submitQcPack } from "@/lib/qc-pack";

export const dynamic = "force-dynamic";

function withLeadCors(response: NextResponse, origin: string | null) {
  if (!origin) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Vary", "Origin");
  return response;
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = origin ? leadPopupAllowedOrigin(origin) : null;
  if (!allowed) return new NextResponse(null, { status: 403 });
  return withLeadCors(new NextResponse(null, { status: 204 }), allowed);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = origin ? leadPopupAllowedOrigin(origin) : null;
  if (origin && !allowed) return NextResponse.json({ ok: false }, { status: 403 });
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const result = await submitQcPack({
    email: String(body.email ?? ""),
    name: String(body.name ?? ""),
    company: String(body.company ?? ""),
    ip: clientIpFromHeaders(request.headers),
    env: process.env,
    popup: true,
  });
  const status = result.ok ? 200 : result.code === "rate" ? 429 : result.code === "send" ? 503 : 400;
  return withLeadCors(NextResponse.json(result, { status }), allowed);
}
