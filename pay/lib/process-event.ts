import type { CatalogStore } from "./catalog-store";
import { createCatalogStore } from "./catalog-store";
import { grantAccess, replayExistingAccountUnlock, revokeAccess, sendDeliveryEmail } from "./fulfillment";
import { captureCheckoutLead } from "./mailchimp";
import { decideAction, emailFromObject, productsFromMetadata, stripeObjectMetadata, type IncomingStripeEvent } from "./stripe-events";
import type { EventStore } from "./event-store";

export type ProcessResult = {
  duplicate: boolean;
  action: "grant" | "revoke" | "decline" | "ignore";
};

async function maybeDeliverEmail(
  event: IncomingStripeEvent,
  deps: {
    env: NodeJS.ProcessEnv;
    fetchImpl: typeof fetch;
    store: EventStore;
    catalog?: CatalogStore;
  },
): Promise<void> {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return;
  const object = event.data?.object ?? {};
  const paymentStatus = String(object.payment_status ?? "");
  if (paymentStatus && paymentStatus !== "paid" && paymentStatus !== "no_payment_required") return;
  const metadata = stripeObjectMetadata(object);
  const email = emailFromObject(object, metadata);
  const productId = metadata.product_id?.trim() ?? "";
  if (!email || !productId) return;
  const entitlements = productsFromMetadata(metadata);
  let product = null;
  try {
    product = (await (deps.catalog ?? createCatalogStore(deps.env)).read()).products.find((item) => item.id === productId) ?? null;
  } catch (error) {
    if (entitlements.length === 0) throw error;
    return;
  }
  if (!product) return;
  await sendDeliveryEmail({
    email,
    eventId: event.id,
    product,
    env: deps.env,
    fetchImpl: deps.fetchImpl,
    store: deps.store,
  });
}

export async function processStripeEvent(
  event: IncomingStripeEvent,
  deps: {
    env: NodeJS.ProcessEnv;
    fetchImpl: typeof fetch;
    store: EventStore;
    catalog?: CatalogStore;
  },
): Promise<ProcessResult> {
  if (!event.id) throw new Error("Stripe event id is required.");
  if (await deps.store.has(event.id)) {
    const action = decideAction(event);
    if (action.kind === "grant" && action.allowCredentials) {
      await replayExistingAccountUnlock({
        email: action.email,
        products: action.products,
        eventId: event.id,
        env: deps.env,
        fetchImpl: deps.fetchImpl,
        store: deps.store,
      });
    }
    return { duplicate: true, action: "ignore" };
  }
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
    await captureCheckoutLead({
      email: action.email,
      products: action.products,
      env: deps.env,
      fetchImpl: deps.fetchImpl,
    });
  } else if (action.kind === "revoke") {
    await revokeAccess({
      email: action.email,
      products: action.products,
      env: deps.env,
      fetchImpl: deps.fetchImpl,
    });
  }
  await maybeDeliverEmail(event, deps);
  await deps.store.mark(event.id, event.type);
  return { duplicate: false, action: action.kind };
}
