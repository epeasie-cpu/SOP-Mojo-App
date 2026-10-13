import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { isDeliveryUnavailable, unavailableGoHtml } from "@/lib/library";
import { checkoutPath } from "@/lib/links";
import { findProduct } from "@/lib/open-checkout";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { product } = await findProduct(createCatalogStore(), decodeURIComponent(slug));
  if (!product || !product.active) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }
  if (isDeliveryUnavailable(product)) {
    return new NextResponse(unavailableGoHtml(product.title), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.redirect(new URL(checkoutPath(product.id), request.url), 302);
}
