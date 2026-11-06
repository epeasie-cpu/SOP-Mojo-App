import { formatUsd, type Product } from "./catalog";

export type QuoteSelection = {
  annual: boolean;
  bump: boolean;
};

export type Quote = {
  amountCents: number;
  interval: "once" | "month" | "year";
  billingLine: string | null;
  priceLabel: string;
  summary: string;
  entitlementProducts: string[];
};

export function quoteProduct(product: Product, selection: QuoteSelection): Quote {
  const annual = Boolean(selection.annual && product.annual && product.billing === "month");
  const bump = Boolean(selection.bump && product.orderBump);
  const base = annual && product.annual ? product.annual.priceCents : product.priceCents;
  const bumpCents = bump && product.orderBump ? product.orderBump.priceCents : 0;
  const amountCents = base + bumpCents;
  const interval: Quote["interval"] = annual ? "year" : product.billing === "month" ? "month" : "once";
  const billingLine =
    interval === "month"
      ? "billed monthly until you cancel"
      : interval === "year"
        ? "billed annually until you cancel"
        : null;
  const priceLabel =
    interval === "month"
      ? `${formatUsd(base)}/month`
      : interval === "year"
        ? `${formatUsd(base)}/year`
        : formatUsd(base);
  const summary = bump && product.orderBump ? `${priceLabel} + ${product.orderBump.title}` : priceLabel;
  const entitlementProducts: string[] = [];
  if (product.entitlementProduct) entitlementProducts.push(product.entitlementProduct);
  if (bump && product.orderBump?.entitlementProduct) {
    entitlementProducts.push(product.orderBump.entitlementProduct);
  }
  return {
    amountCents,
    interval,
    billingLine,
    priceLabel,
    summary,
    entitlementProducts: [...new Set(entitlementProducts)],
  };
}
