import type { Metadata } from "next";
import Link from "next/link";
import { createCatalogStore } from "@/lib/catalog-store";
import { formatUsd } from "@/lib/catalog";
import { productPath } from "@/lib/links";
import { productMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = productMetadata({
  path: "/",
  title: "SOP Mojo Pay",
  description: "Buy Flowchart Plus and Builder Pro from SOP Mojo.",
});

export default async function HomePage() {
  const catalog = await createCatalogStore().read();
  const products = catalog.products.filter((product) => product.active);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">SOP Mojo</p>
      <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">Pay</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-zinc-400">
        Guest checkout for SOP Mojo. Pick a product, pay with a card or wallet, and get Studio access on the email you enter.
      </p>
      <ul className="mt-8 grid gap-4">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={productPath(product.id)}
              className="flex min-h-12 items-center gap-4 rounded-lg border border-zinc-800 p-4 hover:border-lime"
            >
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-sm bg-zinc-900 object-cover" />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-zinc-50">{product.title}</span>
                <span className="block text-sm text-zinc-400">{product.description}</span>
              </span>
              <span className="text-lime">
                {formatUsd(product.priceCents)}
                {product.billing === "month" ? "/mo" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
