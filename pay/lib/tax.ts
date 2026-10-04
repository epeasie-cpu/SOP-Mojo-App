/**
 * The Stripe test account cannot calculate tax. Settings status is pending,
 * head_office is null, and there are no tax registrations.
 * Do not call /v1/tax/settings. Do not invent a head office or a tax amount.
 * Request automatic tax only after that account can calculate it.
 */
export function automaticTaxEnabled(): boolean {
  return false;
}

export const TAX_PENDING_NOTICE =
  "Stripe Tax is not activated. The test account is pending, with no head office and no tax registrations. Checkout does not request automatic tax and does not add a tax amount.";
