import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { quoteProduct } from "@/lib/pricing";
import { findProduct } from "@/lib/open-checkout";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { product } = await findProduct(createCatalogStore(), decodeURIComponent(slug));
  if (!product || !product.active) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }
  const quote = quoteProduct(product, { annual: false, bump: false });
  return NextResponse.json({
    id: product.id,
    title: product.title,
    description: product.description,
    imageUrl: product.imageUrl,
    presentation: product.presentation,
    priceLabel: quote.priceLabel,
    billing: product.billing,
  });
}
