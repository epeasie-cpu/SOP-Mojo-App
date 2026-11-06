import Stripe from "stripe";
import { webhookSecrets } from "./stripe-mode";

export function stripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}

export function constructStripeEvent(
  payload: string,
  signature: string,
  env: NodeJS.ProcessEnv = process.env,
): Stripe.Event {
  const secrets = webhookSecrets(env);
  if (secrets.length === 0) {
    throw new Error("Set STRIPE_WEBHOOK_SECRET before receiving Stripe webhooks.");
  }
  const stripe = new Stripe("sk_test_webhook_construct_only");
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Invalid Stripe signature.");
}
