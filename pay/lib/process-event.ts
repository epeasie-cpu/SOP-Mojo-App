import type { CatalogStore } from "./catalog-store";
import { createCatalogStore } from "./catalog-store";
import { createGrantStore, fulfillSecureDownload, type GrantStore } from "./downloads";
import type { EventStore } from "./event-store";
import { grantAccess, replayExistingAccountUnlock, revokeAccess, sendDeliveryEmail } from "./fulfillment";
import { productForCheckout } from "./library";
import { deliverMakeWebhook, type StoredAccess } from "./make-delivery";
import { captureCheckoutLead } from "./mailchimp";
import { decideAction, emailFromObject, productsFromMetadata, stripeObjectMetadata, type IncomingStripeEvent } from "./stripe-events";

type DeliveryDeps = {
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  store: EventStore;
  catalog?: CatalogStore;
  grants?: GrantStore;
  saveDownloadToken?: (sessionId: string, token: string) => Promise<void>;
  loadDownloadToken?: (sessionId: string) => Promise<string | null>;
  saveOrderAccess?: (order: { orderId: string; accessUrl: string | null }) => Promise<void>;
  loadOrderAccess?: (orderId: string) => Promise<StoredAccess>;
};

export type ProcessResult = {
  duplicate: boolean;
  action: "grant" | "revoke" | "decline" | "ignore";
};

async function maybeDeliverEmail(event: IncomingStripeEvent, deps: DeliveryDeps): Promise<void> {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return;
  const object = event.data?.object ?? {};
  const paymentStatus = String(object.payment_status ?? "");
  if (paymentStatus && paymentStatus !== "paid" && paymentStatus !== "no_payment_required") return;
  const metadata = stripeObjectMetadata(object);
  const email = emailFromObject(object, metadata);
  const productId = metadata.product_id?.trim() ?? "";
  if (!email || !productId) return;
  const entitlements = productsFromMetadata(metadata);
  const catalog = deps.catalog ?? createCatalogStore(deps.env);
  let product = null;
  let stripeMode: "test" | "live" = "test";
  try {
    const snapshot = await catalog.read();
    stripeMode = snapshot.settings.stripeMode;
    product = snapshot.products.find((item) => item.id === productId) ?? null;
  } catch (error) {
    if (entitlements.length === 0) throw error;
    return;
  }
  if (!product) return;
  product = productForCheckout(product);
  if (product.delivery?.kind === "make_webhook") {
    await deliverMakeWebhook({
      email,
      eventId: event.id,
      product,
      session: object,
      env: deps.env,
      fetchImpl: deps.fetchImpl,
      store: deps.store,
      stripeMode,
      saveOrderAccess: deps.saveOrderAccess,
      loadOrderAccess: deps.loadOrderAccess,
    });
    return;
  }
  if (product.delivery?.kind === "secure_file") {
    const sessionId = typeof object.id === "string" ? object.id : "";
    await fulfillSecureDownload({
      email,
      eventId: event.id,
      product,
      sessionId,
      env: deps.env,
      fetchImpl: deps.fetchImpl,
      store: deps.store,
      grants: deps.grants,
      stripeMode,
      saveToken: deps.saveDownloadToken
        ? (token) => {
            const save = deps.saveDownloadToken;
            return save ? save(sessionId, token) : Promise.resolve();
          }
        : undefined,
      loadToken: deps.loadDownloadToken
        ? () => {
            const load = deps.loadDownloadToken;
            return load ? load(sessionId) : Promise.resolve(null);
          }
        : undefined,
    });
    return;
  }
  await sendDeliveryEmail({
    email,
    eventId: event.id,
    product,
    env: deps.env,
    fetchImpl: deps.fetchImpl,
    store: deps.store,
  });
}

async function maybeRevokeDownload(event: IncomingStripeEvent, deps: DeliveryDeps): Promise<void> {
  if (event.type !== "charge.refunded") return;
  const object = event.data?.object ?? {};
  if (!Number(object.amount_refunded ?? 0)) return;
  const sessionId = stripeObjectMetadata(object).checkout_session_id?.trim() ?? "";
  if (!sessionId.startsWith("cs_")) return;
  const grants = deps.grants ?? createGrantStore(deps.env, deps.fetchImpl);
  await grants.revokeBySession(sessionId);
}

export async function processStripeEvent(event: IncomingStripeEvent, deps: DeliveryDeps): Promise<ProcessResult> {
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
  await maybeRevokeDownload(event, deps);
  await deps.store.mark(event.id, event.type);
  return { duplicate: false, action: action.kind };
}
