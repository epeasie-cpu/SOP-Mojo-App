import { SITE } from "./site";

/** Test-mode Billing Portal configuration. Do not create another. */
export const TEST_BILLING_PORTAL_CONFIGURATION_ID = "bpc_1UMuOAQ8wI2jkOVGxwG9WvdF";

export const PORTAL_OPEN_FAILED = "The billing portal could not be opened. Try again in a minute.";

export const PORTAL_NO_CUSTOMER = "No Stripe customer for that email yet.";

export function portalReturnUrl(): string {
  return SITE.host;
}

export function portalSessionParams(input: {
  customerId: string;
  mode: "test" | "live";
  returnUrl?: string;
}): { customer: string; return_url: string; configuration?: string } {
  const params: { customer: string; return_url: string; configuration?: string } = {
    customer: input.customerId,
    return_url: input.returnUrl ?? portalReturnUrl(),
  };
  if (input.mode === "test") params.configuration = TEST_BILLING_PORTAL_CONFIGURATION_ID;
  return params;
}
