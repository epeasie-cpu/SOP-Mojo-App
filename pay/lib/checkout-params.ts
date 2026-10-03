import type Stripe from "stripe";
import type { Product } from "./catalog";
import { checkoutPath } from "./links";
import { quoteProduct } from "./pricing";

const SAAS_TAX_CODE = "txcd_10103001";
const DIGITAL_TAX_CODE = "txcd_10000000";

export function checkoutSessionParams(input: {
  product: Product;
  email: string;
  customerId: string;
  annual: boolean;
  bump: boolean;
  returnOrigin: string;
  tax: boolean;
}): Stripe.Checkout.SessionCreateParams {
  const quote = quoteProduct(input.product, { annual: input.annual, bump: input.bump });
  const annual = quote.interval === "year";
  const mode = quote.interval === "once" ? "payment" : "subscription";
  const entitlements = quote.entitlementProducts.join(",");
  const metadata: Record<string, string> = {
    product_id: input.product.id,
    entitlements,
    email: input.email,
    annual: annual ? "1" : "0",
    bump: input.bump && input.product.orderBump ? "1" : "0",
  };
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (mode === "subscription") {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: annual && input.product.annual ? input.product.annual.priceCents : input.product.priceCents,
        tax_behavior: "exclusive",
        recurring: { interval: annual ? "year" : "month" },
        product_data: {
          name: input.product.title,
          description: input.product.description,
          tax_code: SAAS_TAX_CODE,
          metadata,
        },
      },
    });
  } else {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: input.product.priceCents,
        tax_behavior: "exclusive",
        product_data: {
          name: input.product.title,
          description: input.product.description,
          tax_code: DIGITAL_TAX_CODE,
          metadata,
        },
      },
    });
  }
  if (input.bump && input.product.orderBump) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: input.product.orderBump.priceCents,
        tax_behavior: "exclusive",
        product_data: {
          name: input.product.orderBump.title,
          description: input.product.orderBump.description,
          tax_code: DIGITAL_TAX_CODE,
        },
      },
    });
  }
  const returnUrl = `${input.returnOrigin}${checkoutPath(input.product.id)}/complete?session_id={CHECKOUT_SESSION_ID}`;
  const params: Stripe.Checkout.SessionCreateParams = {
    ui_mode: "elements",
    mode,
    customer: input.customerId,
    line_items: lineItems,
    metadata,
    return_url: returnUrl,
    billing_address_collection: input.tax ? "auto" : undefined,
    automatic_tax: { enabled: input.tax },
  };
  if (mode === "payment") {
    params.payment_intent_data = { metadata, receipt_email: input.email };
    params.invoice_creation = { enabled: true };
  } else {
    params.subscription_data = { metadata };
  }
  return params;
}

export function isTaxConfigurationError(error: unknown): boolean {
  const row = error as { message?: string; code?: string; type?: string };
  const message = `${row?.message ?? ""} ${row?.code ?? ""}`.toLowerCase();
  return message.includes("tax");
}
