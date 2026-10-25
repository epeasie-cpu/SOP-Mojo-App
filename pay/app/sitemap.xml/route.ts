import { createCatalogStore } from "@/lib/catalog-store";
import { AUP_CANONICAL_PATH } from "@/lib/aup-landing";
import { BLUEPRINT_PATH } from "@/lib/blueprint-page";
import { FOUNDER_TRAP_PATH } from "@/lib/founder-trap-page";
import { OFFERS_PATH } from "@/lib/offers-page";
import { QMS_CANONICAL_PATH } from "@/lib/qms-page";
import { productPath } from "@/lib/links";
import { isDashboardSlug, isFreeAupSlug, isFreeFounderTrapSlug } from "@/lib/library";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await createCatalogStore().read();
  const paths = [
    "/",
    "/legal/terms",
    "/legal/refunds",
    AUP_CANONICAL_PATH,
    BLUEPRINT_PATH,
    OFFERS_PATH,
    FOUNDER_TRAP_PATH,
    QMS_CANONICAL_PATH,
    ...catalog.products
      .filter(
        (product) =>
          product.active &&
          !isFreeAupSlug(product.id) &&
          !product.leadMagnet &&
          !isFreeFounderTrapSlug(product.id) &&
          !isDashboardSlug(product.id),
      )
      .map((product) => productPath(product.id)),
  ];
  const urls = paths
    .map(
      (path) => `  <url><loc>${absoluteUrl(path)}</loc></url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
