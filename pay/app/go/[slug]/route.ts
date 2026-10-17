import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { deliveryIsBlocked, FREE_AUP_PATH, isFreeAupSlug, productForCheckout, unavailableGoHtml } from "@/lib/library";
import { checkoutPath } from "@/lib/links";
import { findProduct } from "@/lib/open-checkout";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const id = decodeURIComponent(slug);
  if (isFreeAupSlug(id)) {
    return NextResponse.redirect(new URL(FREE_AUP_PATH, request.url), 302);
  }
  const loaded = await findProduct(createCatalogStore(), id);
  const product = loaded.product ? productForCheckout(loaded.product) : null;
  if (!product || !product.active) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }
  if (await deliveryIsBlocked(product)) {
    return new NextResponse(unavailableGoHtml(product.title), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.redirect(new URL(checkoutPath(product.id), request.url), 302);
}
