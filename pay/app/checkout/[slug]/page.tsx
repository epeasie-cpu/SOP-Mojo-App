import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutExperience } from "@/components/CheckoutExperience";
import { createCatalogStore } from "@/lib/catalog-store";
import { findProduct } from "@/lib/open-checkout";
import { checkoutMetadata } from "@/lib/seo";
import { stripeCredentials } from "@/lib/stripe-mode";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await findProduct(createCatalogStore(), decodeURIComponent(slug));
  return checkoutMetadata(product ? `${product.title} checkout` : "Checkout");
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { snapshot, product } = await findProduct(createCatalogStore(), decodeURIComponent(slug));
  if (!product || !product.active) notFound();
  const creds = stripeCredentials(process.env, snapshot.settings.stripeMode);
  return (
    <CheckoutExperience
      product={product}
      publishableKey={creds.publishableKey}
      mode={creds.mode}
      embed={query.embed === "1"}
    />
  );
}
