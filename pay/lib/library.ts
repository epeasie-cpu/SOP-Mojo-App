import { parseProduct, type Product } from "./catalog";
import type { CatalogStore } from "./catalog-store";

export const NOT_AVAILABLE_YET = "Not available yet";

/** Rows the library seed must never write. */
export const PROTECTED_CATALOG_IDS = ["builder_pro", "flowchart_plus", "__settings"] as const;

export function isDeliveryUnavailable(product: Product): boolean {
  return product.delivery?.kind === "email_link" && product.delivery.url.trim() === "";
}

export function checkoutErrorStatus(message: string): number {
  return message === NOT_AVAILABLE_YET ? 409 : 503;
}

export function unavailableGoHtml(title: string): string {
  const name = escapeHtml(title.trim() || "This product");
  return `<!doctype html>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>${NOT_AVAILABLE_YET}</title>
<main style="font-family:sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem">
  <h1>${NOT_AVAILABLE_YET}</h1>
  <p>${name} is not available yet.</p>
</main>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LibrarySeed = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  label: string;
};

export const AUP_PRODUCT_ID = "aup_generator";

/** SamCart product slug the existing Make scenario already maps. */
export const AUP_SAMCART_SLUG = "acceptable-use-policy-generator";

/** Name of the env var that holds the Make webhook URL. The URL itself is never written here. */
export const AUP_MAKE_ENV = "AUP_MAKE_WEBHOOK_URL";

export const ACCESS_LINK_ON_THE_WAY = "Your access link is on its way by email";

const LIBRARY_SEEDS: LibrarySeed[] = [
  {
    id: AUP_PRODUCT_ID,
    title: "Acceptable Use Policy Generator",
    description: "Access to the acceptable use policy tool. The buyer's link is created after payment.",
    priceCents: 9799,
    label: "Open the policy tool",
  },
  {
    id: "business_os_dashboard",
    title: "Business OS Dashboard",
    description: "Downloadable Business OS dashboard.",
    priceCents: 499,
    label: "Download",
  },
  {
    id: "business_os_blueprint",
    title: "Business OS Blueprint",
    description: "Downloadable Business OS playbook.",
    priceCents: 2700,
    label: "Download",
  },
  {
    id: "offers_guide",
    title: "The Ultimate Guide to Creating High-Converting Offers That Sell",
    description: "Downloadable guide to creating offers that sell.",
    priceCents: 1998,
    label: "Download",
  },
];

function libraryDelivery(seed: LibrarySeed): Product["delivery"] {
  if (seed.id === AUP_PRODUCT_ID) {
    return { kind: "make_webhook", envVar: AUP_MAKE_ENV, label: seed.label };
  }
  return { kind: "email_link", url: "", label: seed.label };
}

/** Four SOP Library products. Download links stay empty until an admin pastes them. */
export function libraryProducts(): Product[] {
  return LIBRARY_SEEDS.map((seed) =>
    parseProduct({
      id: seed.id,
      title: seed.title,
      description: seed.description,
      priceCents: seed.priceCents,
      currency: "usd",
      imageUrl: "",
      billing: "once",
      annual: null,
      orderBump: null,
      presentation: "panel",
      entitlementProduct: null,
      delivery: libraryDelivery(seed),
      active: true,
    }),
  );
}

/** Point an existing aup_generator row at the Make webhook without rewriting other products. */
export async function syncAupDelivery(store: CatalogStore): Promise<string[]> {
  const snapshot = await store.read();
  const current = snapshot.products.find((product) => product.id === AUP_PRODUCT_ID);
  if (!current) return [];
  if (current.delivery?.kind === "make_webhook") return [];
  const next = productForCheckout(current);
  await store.updateProduct(next);
  return [AUP_PRODUCT_ID];
}

export function productForCheckout(product: Product): Product {
  if (product.id !== AUP_PRODUCT_ID) return product;
  if (product.delivery?.kind === "make_webhook") return product;
  return {
    ...product,
    entitlementProduct: null,
    delivery: {
      kind: "make_webhook",
      envVar: AUP_MAKE_ENV,
      label: product.delivery?.label?.trim() || "Open the policy tool",
    },
  };
}
