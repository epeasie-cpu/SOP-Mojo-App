import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { allowedReturnOrigin } from "@/lib/links";
import { findProduct, normalizeBuyerEmail, openCheckoutSession, updateCheckoutSession } from "@/lib/open-checkout";

export const dynamic = "force-dynamic";

function buyerEmail(value: unknown): { email: string | null; error: string | null } {
  if (value == null || value === "") return { email: null, error: null };
  const email = normalizeBuyerEmail(value);
  if (!email) return { email: null, error: "Enter a valid email to continue." };
  return { email, error: null };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    slug?: string;
    email?: string;
    annual?: boolean;
    bump?: boolean;
    returnOrigin?: string;
  } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const { email, error } = buyerEmail(body?.email);
  if (!slug || error) {
    return NextResponse.json({ error: error || "Choose a product." }, { status: 400 });
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
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
    slug?: string;
    email?: string;
    annual?: boolean;
    bump?: boolean;
    lineItems?: boolean;
  } | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const { email, error } = buyerEmail(body?.email);
  if (!sessionId.startsWith("cs_") || !slug || error) {
    return NextResponse.json({ error: error || "Checkout session is missing." }, { status: 400 });
  }
  const store = createCatalogStore();
  const { snapshot, product } = await findProduct(store, slug);
  if (!product || !product.active) {
    return NextResponse.json({ error: "That product is not for sale." }, { status: 404 });
  }
  try {
    await updateCheckoutSession({
      sessionId,
      product,
      email,
      annual: Boolean(body?.annual),
      bump: Boolean(body?.bump),
      lineItems: Boolean(body?.lineItems),
      snapshot,
    });
    return NextResponse.json({ ok: true });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not update checkout.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
