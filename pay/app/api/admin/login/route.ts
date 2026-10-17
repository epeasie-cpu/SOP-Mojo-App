import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  accessCodeMatches,
  adminEmails,
  signMagicLink,
  signSession,
  signingKey,
} from "@/lib/admin-session";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string; email?: string } | null;
  if (!signingKey()) {
    return NextResponse.json(
      { error: "Set ADMIN_ACCESS_CODE in the project environment, then sign in with that code." },
      { status: 503 },
    );
  }
  if (body?.email) {
    const email = body.email.trim().toLowerCase();
    if (!adminEmails().includes(email)) {
      return NextResponse.json({ ok: true });
    }
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) {
      return NextResponse.json(
        { error: "Magic link email needs RESEND_API_KEY. Use the access code instead." },
        { status: 503 },
      );
    }
    const token = signMagicLink(email);
    const link = `${absoluteUrl("/admin/magic")}?token=${encodeURIComponent(token)}`;
    const from = process.env.EMAIL_FROM?.trim() || "SOP Mojo <onboarding@resend.dev>";
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your SOP Mojo Pay sign-in link",
        text: `Sign in to the catalog:\n\n${link}\n\nThis link expires in 30 minutes.`,
      }),
    });
    if (!sent.ok) return NextResponse.json({ error: "Could not send the sign-in email." }, { status: 502 });
    return NextResponse.json({ ok: true });
  }
  if (!process.env.ADMIN_ACCESS_CODE?.trim()) {
    return NextResponse.json({ error: "Access code sign-in is not configured." }, { status: 503 });
  }
  if (!accessCodeMatches(body?.code ?? "")) {
    return NextResponse.json({ error: "That code is wrong." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signSession(adminEmails()[0] ?? "ryan@sopmojo.com"), cookieOptions());
  return NextResponse.json({ ok: true });
}
