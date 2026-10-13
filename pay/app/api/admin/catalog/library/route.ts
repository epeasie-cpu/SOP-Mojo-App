import { NextResponse } from "next/server";
import { createCatalogStore } from "@/lib/catalog-store";
import { libraryProducts } from "@/lib/library";
import { isResponse, requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    const result = await createCatalogStore().insertIfAbsent(libraryProducts());
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add the library products.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
