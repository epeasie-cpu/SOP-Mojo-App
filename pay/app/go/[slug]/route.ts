import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { checkoutPath } from "@/lib/links";
import { findProduct } from "@/lib/open-checkout";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { product } = await findProduct(createCatalogStore(), decodeURIComponent(slug));
  if (!product || !product.active) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }
  return NextResponse.redirect(new URL(checkoutPath(product.id), request.url), 302);
}
