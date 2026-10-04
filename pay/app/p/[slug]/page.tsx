import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createCatalogStore } from "@/lib/catalog-store";
import { productJsonLd } from "@/lib/catalog";
import { productPath, stablePath } from "@/lib/links";
import { findProduct } from "@/lib/open-checkout";
import { quoteProduct } from "@/lib/pricing";
import { productMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await findProduct(createCatalogStore(), decodeURIComponent(slug));
  if (!product) return productMetadata({ path: "/p", title: "Product | SOP Mojo", description: "" });
  return productMetadata({
    path: productPath(product.id),
    title: product.seo.title || `${product.title} | SOP Mojo`,
    description: product.seo.description || product.description,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { product } = await findProduct(createCatalogStore(), decodeURIComponent(slug));
  if (!product || !product.active) notFound();
  const quote = quoteProduct(product, { annual: false, bump: false });
  const jsonLd = productJsonLd(product, absoluteUrl(productPath(product.id)));
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <article className="grid gap-6">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-16 w-16 rounded-sm bg-zinc-900 object-cover" />
        ) : null}
        <h1 className="font-display text-4xl font-semibold tracking-tight">{product.title}</h1>
        <p className="max-w-xl text-lg leading-7 text-zinc-300">{product.description}</p>
        <p className="text-2xl font-semibold text-lime">{quote.priceLabel}</p>
        {product.annual ? <p className="text-sm text-zinc-400">{product.annual.label}</p> : null}
        <Link
          href={stablePath(product.id)}
          className="inline-flex min-h-12 items-center justify-center rounded-sm bg-lime px-5 text-base font-semibold text-lime-ink"
        >
          Buy {product.title}
        </Link>
      </article>
    </div>
  );
}
