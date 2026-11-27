import { NextResponse } from "next/server";
import { parseCatalog } from "@/lib/catalog";
import { createCatalogStore } from "@/lib/catalog-store";
import { embedSnippet, stableUrl } from "@/lib/links";
import { isResponse, requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const snapshot = await createCatalogStore().read();
  return NextResponse.json({
    ...snapshot,
    links: snapshot.products.map((product) => ({
      id: product.id,
      stableUrl: stableUrl(product.id),
      embed: embedSnippet(product.id, product.title),
    })),
  });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  const body = await request.json().catch(() => null);
  try {
    const snapshot = parseCatalog(body);
    await createCatalogStore().write(snapshot);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the catalog.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
