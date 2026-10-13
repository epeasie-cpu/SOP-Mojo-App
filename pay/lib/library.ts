import { parseProduct, type Product } from "./catalog";

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

const LIBRARY_SEEDS: LibrarySeed[] = [
  {
    id: "aup_generator",
    title: "Acceptable Use Policy Generator",
    description: "Access to the acceptable use policy tool. The link is emailed after payment.",
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

/** Four SOP Library products. Delivery URL stays empty until an admin pastes the link. */
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
      delivery: { kind: "email_link", url: "", label: seed.label },
      active: true,
    }),
  );
}
