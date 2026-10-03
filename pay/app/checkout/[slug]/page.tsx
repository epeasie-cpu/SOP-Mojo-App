import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CheckoutExperience } from "@/components/CheckoutExperience";
import { createCatalogStore } from "@/lib/catalog-store";
import { allowedReturnOrigin } from "@/lib/links";
import { findProduct, openCheckoutSession } from "@/lib/open-checkout";
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
  const store = createCatalogStore();
  const { snapshot, product } = await findProduct(store, decodeURIComponent(slug));
  if (!product || !product.active) notFound();
  const creds = stripeCredentials(process.env, snapshot.settings.stripeMode);
  let clientSecret: string | null = null;
  let sessionId: string | null = null;
  let sessionError: string | null = null;
  if (creds.secretKey && creds.publishableKey) {
    const headerList = await headers();
    const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").split(",")[0]?.trim() ?? "";
    try {
      const opened = await openCheckoutSession({
        product,
        email: null,
        annual: false,
        bump: false,
        returnOrigin: allowedReturnOrigin(null, host),
        snapshot,
        store,
      });
      clientSecret = opened.clientSecret;
      sessionId = opened.sessionId;
    } catch (error) {
      sessionError = error instanceof Error ? error.message : "Could not start checkout.";
    }
  }
  return (
    <CheckoutExperience
      product={product}
      publishableKey={creds.publishableKey}
      mode={creds.mode}
      embed={query.embed === "1"}
      clientSecret={clientSecret}
      sessionId={sessionId}
      sessionError={sessionError}
    />
  );
}
