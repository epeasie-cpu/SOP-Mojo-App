import { NextResponse } from "next/server";
import { createGrantStore, downloadRecoveryHtml, openDownload, resendDownloadLink } from "@/lib/downloads";
import { BLUEPRINT_PRODUCT_ID } from "@/lib/library";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function recovery(posted: boolean): NextResponse {
  return new NextResponse(downloadRecoveryHtml(posted), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  try {
    const opened = await openDownload({
      token: decodeURIComponent(token),
      grants: createGrantStore(),
      env: process.env,
    });
    if ("redirect" in opened) return NextResponse.redirect(opened.redirect, 302);
  } catch {
    console.info(JSON.stringify({ source: "secure_file", step: "sign", ok: false }));
  }
  return recovery(false);
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const email = String(form?.get("email") ?? "");
  const productId = String(form?.get("product") ?? "");
  if (productId === BLUEPRINT_PRODUCT_ID) {
    await resendDownloadLink({
      email,
      productId,
      ip: clientIp(request),
      env: process.env,
      fetchImpl: fetch,
    }).catch(() => undefined);
  }
  return recovery(true);
}
