export type StripeMode = "test" | "live";

export type StripeCredentials = {
  mode: StripeMode;
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
};

export function stripeCredentials(env: NodeJS.ProcessEnv, mode: StripeMode): StripeCredentials {
  if (mode === "live") {
    return {
      mode,
      secretKey: env.STRIPE_LIVE_SECRET_KEY?.trim() ?? "",
      publishableKey: env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY?.trim() ?? "",
      webhookSecret: env.STRIPE_LIVE_WEBHOOK_SECRET?.trim() ?? "",
    };
  }
  return {
    mode: "test",
    secretKey: env.STRIPE_SECRET_KEY?.trim() ?? "",
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "",
    webhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() ?? "",
  };
}

export function webhookSecrets(env: NodeJS.ProcessEnv): string[] {
  return [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_LIVE_WEBHOOK_SECRET]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
}
