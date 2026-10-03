import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { normalizeBuyerEmail } from "@/lib/open-checkout";
import { stripeClient } from "@/lib/stripe-client";
import { stripeCredentials } from "@/lib/stripe-mode";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; returnOrigin?: string } | null;
  const email = normalizeBuyerEmail(body?.email);
  if (!email) return NextResponse.json({ error: "Enter the email you paid with." }, { status: 400 });
  const snapshot = await createCatalogStore().read();
  const creds = stripeCredentials(process.env, snapshot.settings.stripeMode);
  if (!creds.secretKey) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
  }
  const stripe = stripeClient(creds.secretKey);
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    return NextResponse.json({ error: "No Stripe customer for that email yet." }, { status: 404 });
  }
  const origin = new URL(request.url).origin;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Customer Portal is not available.";
    return NextResponse.json(
      {
        error: message,
        blocker:
          "Turn on the Stripe Customer Portal in the Stripe Dashboard (Settings → Billing → Customer portal), then try again.",
      },
      { status: 503 },
    );
  }
}
