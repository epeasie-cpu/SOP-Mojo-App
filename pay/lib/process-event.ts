import { captureCheckoutLead } from "./mailchimp";
import { decideAction, type IncomingStripeEvent } from "./stripe-events";
import type { EventStore } from "./event-store";
import { grantAccess, revokeAccess } from "./fulfillment";

export type ProcessResult = {
  duplicate: boolean;
  action: "grant" | "revoke" | "decline" | "ignore";
};

export async function processStripeEvent(
  event: IncomingStripeEvent,
  deps: {
    env: NodeJS.ProcessEnv;
    fetchImpl: typeof fetch;
    store: EventStore;
  },
): Promise<ProcessResult> {
  if (!event.id) throw new Error("Stripe event id is required.");
  if (await deps.store.has(event.id)) return { duplicate: true, action: "ignore" };
  const action = decideAction(event);
  if (action.kind === "grant") {
    await grantAccess({
      email: action.email,
      products: action.products,
      eventId: event.id,
      allowCredentials: action.allowCredentials,
      env: deps.env,
      fetchImpl: deps.fetchImpl,
      store: deps.store,
    });
    await captureCheckoutLead({ email: action.email, env: deps.env, fetchImpl: deps.fetchImpl });
  } else if (action.kind === "revoke") {
    await revokeAccess({
      email: action.email,
      products: action.products,
      env: deps.env,
      fetchImpl: deps.fetchImpl,
    });
  }
  await deps.store.mark(event.id, event.type);
  return { duplicate: false, action: action.kind };
}
