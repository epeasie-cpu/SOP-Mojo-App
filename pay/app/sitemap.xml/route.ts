import { createCatalogStore } from "@/lib/catalog-store";
import { productPath } from "@/lib/links";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await createCatalogStore().read();
  const paths = ["/", "/legal/terms", "/legal/refunds", ...catalog.products.filter((product) => product.active).map((product) => productPath(product.id))];
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
