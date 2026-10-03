import { NextResponse } from "next/server";
import { createEventStore } from "@/lib/event-store";
import { hydrateBuyerEmail } from "@/lib/hydrate-buyer";
import { processStripeEvent } from "@/lib/process-event";
import { constructStripeEvent } from "@/lib/stripe-client";
import type { IncomingStripeEvent } from "@/lib/stripe-events";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  let event: IncomingStripeEvent;
  try {
    const verified = constructStripeEvent(payload, signature);
    event = {
      id: verified.id,
      type: verified.type,
      data: { object: verified.data.object as unknown as Record<string, unknown> },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  try {
    await hydrateBuyerEmail(event);
    const result = await processStripeEvent(event, {
      env: process.env,
      fetchImpl: fetch,
      store: createEventStore(),
    });
    return NextResponse.json({ received: true, duplicate: result.duplicate, action: result.action });
  } catch (error) {
    console.error("stripe webhook failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Fulfillment failed. Stripe will retry." }, { status: 500 });
  }
}
