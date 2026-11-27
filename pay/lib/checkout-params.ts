import type Stripe from "stripe";
import type { Product } from "./catalog";
import { checkoutPath } from "./links";
import { quoteProduct } from "./pricing";

const SAAS_TAX_CODE = "txcd_10103001";
const DIGITAL_TAX_CODE = "txcd_10000000";

export type CheckoutSelection = {
  email?: string | null;
  annual: boolean;
  bump: boolean;
};

export function sessionMetadata(product: Product, selection: CheckoutSelection): Record<string, string> {
  const quote = quoteProduct(product, selection);
  const metadata: Record<string, string> = {
    product_id: product.id,
    entitlements: quote.entitlementProducts.join(","),
    annual: quote.interval === "year" ? "1" : "0",
    bump: selection.bump && product.orderBump ? "1" : "0",
  };
  const email = selection.email?.trim().toLowerCase();
  if (email) metadata.email = email;
  return metadata;
}

export function checkoutLineItems(
  product: Product,
  selection: CheckoutSelection,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const quote = quoteProduct(product, selection);
  const annual = quote.interval === "year";
  const metadata = sessionMetadata(product, selection);
  const mode = quote.interval === "once" ? "payment" : "subscription";
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (mode === "subscription") {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: annual && product.annual ? product.annual.priceCents : product.priceCents,
        tax_behavior: "exclusive",
        recurring: { interval: annual ? "year" : "month" },
        product_data: {
          name: product.title,
          description: product.description,
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
        unit_amount: product.priceCents,
        tax_behavior: "exclusive",
        product_data: {
          name: product.title,
          description: product.description,
          tax_code: DIGITAL_TAX_CODE,
          metadata,
        },
      },
    });
  }
  if (selection.bump && product.orderBump) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: product.orderBump.priceCents,
        tax_behavior: "exclusive",
        product_data: {
          name: product.orderBump.title,
          description: product.orderBump.description,
          tax_code: DIGITAL_TAX_CODE,
        },
      },
    });
  }
  return lineItems;
}

export function checkoutSessionParams(input: {
  product: Product;
  email?: string | null;
  customerId?: string | null;
  annual: boolean;
  bump: boolean;
  returnOrigin: string;
  tax: boolean;
}): Stripe.Checkout.SessionCreateParams {
  const selection = { email: input.email, annual: input.annual, bump: input.bump };
  const quote = quoteProduct(input.product, selection);
  const mode = quote.interval === "once" ? "payment" : "subscription";
  const metadata = sessionMetadata(input.product, selection);
  const email = metadata.email;
  const params: Stripe.Checkout.SessionCreateParams = {
    ui_mode: "elements",
    mode,
    line_items: checkoutLineItems(input.product, selection),
    metadata,
    return_url: `${input.returnOrigin}${checkoutPath(input.product.id)}/complete?session_id={CHECKOUT_SESSION_ID}`,
    billing_address_collection: input.tax ? "auto" : undefined,
    automatic_tax: { enabled: input.tax },
  };
  if (input.customerId) params.customer = input.customerId;
  if (mode === "payment") {
    params.payment_intent_data = email ? { metadata, receipt_email: email } : { metadata };
    params.invoice_creation = { enabled: true };
    if (!input.customerId) params.customer_creation = "always";
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
