import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckoutExperience } from "@/components/CheckoutExperience";
import { createCatalogStore } from "@/lib/catalog-store";
import type { CatalogSnapshot, Product } from "@/lib/catalog";
import { allowedReturnOrigin } from "@/lib/links";
import { findProduct, openCheckoutSession } from "@/lib/open-checkout";
import { quoteProduct } from "@/lib/pricing";
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

function CheckoutProductFallback({ product, embed }: { product: Product; embed: boolean }) {
  const quote = quoteProduct(product, { annual: false, bump: false });
  return (
    <div className={`mx-auto w-full max-w-lg px-4 ${embed ? "py-4" : "py-8"}`}>
      <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-50">{product.title}</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-400">{product.description}</p>
        <p className="mt-4 text-2xl font-semibold text-lime">{quote.summary}</p>
        <p className="mt-4 text-sm text-zinc-400" role="status">
          Loading payment fields…
        </p>
      </article>
    </div>
  );
}

async function CheckoutSessionBody({
  product,
  snapshot,
  embed,
  publishableKey,
  mode,
}: {
  product: Product;
  snapshot: CatalogSnapshot;
  embed: boolean;
  publishableKey: string;
  mode: "test" | "live";
}) {
  const store = createCatalogStore();
  const headerList = await headers();
  const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").split(",")[0]?.trim() ?? "";
  let clientSecret: string | null = null;
  let sessionId: string | null = null;
  let sessionError: string | null = null;
  if (publishableKey) {
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
      publishableKey={publishableKey}
      mode={mode}
      embed={embed}
      clientSecret={clientSecret}
      sessionId={sessionId}
      sessionError={sessionError}
    />
  );
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
  const embed = query.embed === "1";
  const store = createCatalogStore();
  const { snapshot, product } = await findProduct(store, decodeURIComponent(slug));
  if (!product || !product.active) notFound();
  const creds = stripeCredentials(process.env, snapshot.settings.stripeMode);
  const session = (
    <CheckoutSessionBody
      product={product}
      snapshot={snapshot}
      embed={embed}
      publishableKey={creds.publishableKey}
      mode={creds.mode}
    />
  );
  if (!embed) return session;
  return (
    <>
      <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://api.stripe.com" crossOrigin="" />
      <link rel="preload" href="https://js.stripe.com/v3" as="script" crossOrigin="anonymous" />
      <Suspense fallback={<CheckoutProductFallback product={product} embed />}>{session}</Suspense>
    </>
  );
}
