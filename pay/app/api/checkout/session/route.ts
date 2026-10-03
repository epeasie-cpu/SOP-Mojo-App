import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { allowedReturnOrigin } from "@/lib/links";
import { findProduct, normalizeBuyerEmail, openCheckoutSession } from "@/lib/open-checkout";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    email?: string;
    annual?: boolean;
    bump?: boolean;
    returnOrigin?: string;
  } | null;
  const email = normalizeBuyerEmail(body?.email);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!email || !slug) {
    return NextResponse.json({ error: "Enter a valid email to continue." }, { status: 400 });
  }
  const store = createCatalogStore();
  const { snapshot, product } = await findProduct(store, slug);
  if (!product || !product.active) {
    return NextResponse.json({ error: "That product is not for sale." }, { status: 404 });
  }
  const requestHost = new URL(request.url).host;
  try {
    const session = await openCheckoutSession({
      product,
      email,
      annual: Boolean(body?.annual),
      bump: Boolean(body?.bump),
      returnOrigin: allowedReturnOrigin(body?.returnOrigin, requestHost),
      snapshot,
      store,
    });
    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
