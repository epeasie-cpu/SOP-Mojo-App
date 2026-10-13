import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { quoteProduct } from "@/lib/pricing";
import { findProduct } from "@/lib/open-checkout";

export const dynamic = "force-dynamic";

const PRODUCT_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withProductCors(response: NextResponse) {
  for (const [name, value] of Object.entries(PRODUCT_CORS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function OPTIONS() {
  return withProductCors(new NextResponse(null, { status: 204 }));
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const { product } = await findProduct(createCatalogStore(), decodeURIComponent(slug));
    if (!product || !product.active) {
      return withProductCors(NextResponse.json({ error: "Unknown product." }, { status: 404 }));
    }
    const quote = quoteProduct(product, { annual: false, bump: false });
    return withProductCors(
      NextResponse.json({
        id: product.id,
        title: product.title,
        description: product.description,
        imageUrl: product.imageUrl,
        presentation: product.presentation,
        priceLabel: quote.priceLabel,
        billing: product.billing,
      }),
    );
  } catch {
    return withProductCors(NextResponse.json({ error: "Could not load that product." }, { status: 500 }));
  }
}
