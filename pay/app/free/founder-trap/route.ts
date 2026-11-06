import { NextResponse } from "next/server";
import { FOUNDER_TRAP_PATH } from "@/lib/founder-trap-page";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return NextResponse.redirect(new URL(FOUNDER_TRAP_PATH, request.url), 302);
}
