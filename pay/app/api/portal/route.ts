import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { normalizeBuyerEmail } from "@/lib/open-checkout";
import { PORTAL_NO_CUSTOMER, PORTAL_OPEN_FAILED, portalSessionParams } from "@/lib/portal";
import { stripeClient } from "@/lib/stripe-client";
import { stripeCredentials } from "@/lib/stripe-mode";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: string } | null;
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
    if (!customer) return NextResponse.json({ error: PORTAL_NO_CUSTOMER }, { status: 404 });
    const session = await stripe.billingPortal.sessions.create(
      portalSessionParams({ customerId: customer.id, mode: creds.mode }),
    );
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("billing portal session failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: PORTAL_OPEN_FAILED }, { status: 503 });
  }
}
