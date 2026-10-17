import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { libraryProducts, syncAupDelivery, syncBlueprintDelivery, syncOffersDelivery } from "@/lib/library";
import { isResponse, requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    const store = createCatalogStore();
    const result = await store.insertIfAbsent(libraryProducts());
    const updated = [
      ...(await syncAupDelivery(store)),
      ...(await syncBlueprintDelivery(store)),
      ...(await syncOffersDelivery(store)),
    ];
    return NextResponse.json({ ...result, updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add the library products.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
