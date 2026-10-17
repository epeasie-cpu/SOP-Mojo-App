import { parseProduct, type Product } from "./catalog";
import type { CatalogStore } from "./catalog-store";
import { deliverableExists } from "./deliverables";

export const NOT_AVAILABLE_YET = "Not available yet";

/** Rows the library seed must never write. */
export const PROTECTED_CATALOG_IDS = ["builder_pro", "flowchart_plus", "__settings"] as const;

export function isDeliveryUnavailable(product: Product): boolean {
  return product.delivery?.kind === "email_link" && product.delivery.url.trim() === "";
}

/** Empty email links, and secure files whose private object is not in storage yet. */
export async function deliveryIsBlocked(
  product: Product,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: typeof fetch,
): Promise<boolean> {
  if (isDeliveryUnavailable(product)) return true;
  if (product.delivery?.kind !== "secure_file") return false;
  const ready = await deliverableExists({
    storagePath: product.delivery.storagePath,
    env,
    fetchImpl,
  });
  return !ready;
}

export function checkoutErrorStatus(message: string): number {
  return message === NOT_AVAILABLE_YET ||
    message === FREE_AUP_CHECKOUT_ERROR ||
    message === FREE_FOUNDER_TRAP_CHECKOUT_ERROR
    ? 409
    : 503;
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

export const BLUEPRINT_PRODUCT_ID = "business_os_blueprint";

export const DASHBOARD_PRODUCT_ID = "business_os_dashboard";

/** Private bucket plus object key. The bucket name is the first segment. */
export const BLUEPRINT_STORAGE_PATH = "deliverables/business-os-blueprint.pdf";

export const BLUEPRINT_FILENAME = "Business-OS-Blueprint.pdf";

export const OFFERS_PRODUCT_ID = "offers_guide";

/** Ryan confirmed $19.99. The earlier seed was $19.98. */
export const OFFERS_PRICE_CENTS = 1999;

export const OFFERS_STORAGE_PATH = "deliverables/high-converting-offers-guide.pdf";

export const OFFERS_FILENAME = "High-Converting-Offers-Guide.pdf";

export const FOUNDER_TRAP_PRODUCT_ID = "founder_trap_guide";

export const FOUNDER_TRAP_STORAGE_PATH = "deliverables/escape-the-founder-trap.pdf";

export const FOUNDER_TRAP_FILENAME = "Escape-the-Founder-Trap.pdf";

export function secureFileLocation(productId: string): { storagePath: string; filename: string } | null {
  if (productId === BLUEPRINT_PRODUCT_ID) {
    return { storagePath: BLUEPRINT_STORAGE_PATH, filename: BLUEPRINT_FILENAME };
  }
  if (productId === OFFERS_PRODUCT_ID) {
    return { storagePath: OFFERS_STORAGE_PATH, filename: OFFERS_FILENAME };
  }
  if (productId === FOUNDER_TRAP_PRODUCT_ID) {
    return { storagePath: FOUNDER_TRAP_STORAGE_PATH, filename: FOUNDER_TRAP_FILENAME };
  }
  return null;
}

/**
 * Ready for the checkout bump UI, but not attached.
 * The dashboard has no file yet, so selling it as a bump would take money for nothing.
 */
export const BLUEPRINT_BUMP_READY = {
  title: "the Business OS Diagnostic Dashboard",
  description: "Add the Business OS Diagnostic Dashboard: $4.99",
  priceCents: 499,
  entitlementProduct: null,
} as const;

/** Public free gate. Checkout and /go send every AUP visitor here. */
export const FREE_AUP_PATH = "/free/aup-generator";

export const FREE_AUP_CHECKOUT_ERROR = "The AUP Generator is free.";

export const FREE_FOUNDER_TRAP_CHECKOUT_ERROR = "Escape the Founder Trap is free.";

export function isFreeFounderTrapSlug(value: string): boolean {
  const id = value.trim().toLowerCase().replace(/-/g, "_");
  return id === FOUNDER_TRAP_PRODUCT_ID;
}

export function isFreeAupSlug(value: string): boolean {
  const id = value.trim().toLowerCase().replace(/-/g, "_");
  return id === AUP_PRODUCT_ID;
}

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
    id: OFFERS_PRODUCT_ID,
    title: "The Ultimate Guide to Creating High-Converting Offers That Sell",
    description: "Downloadable guide to creating offers that sell.",
    priceCents: OFFERS_PRICE_CENTS,
    label: "Download",
  },
  {
    id: FOUNDER_TRAP_PRODUCT_ID,
    title: "Escape the Founder Trap",
    description: "Free guide to escaping the founder trap.",
    priceCents: 0,
    label: "Download",
  },
];

function libraryDelivery(seed: LibrarySeed): Product["delivery"] {
  if (seed.id === AUP_PRODUCT_ID) {
    return { kind: "make_webhook", envVar: AUP_MAKE_ENV, label: seed.label };
  }
  if (seed.id === BLUEPRINT_PRODUCT_ID) {
    return { kind: "secure_file", storagePath: BLUEPRINT_STORAGE_PATH, filename: BLUEPRINT_FILENAME };
  }
  if (seed.id === OFFERS_PRODUCT_ID) {
    return { kind: "secure_file", storagePath: OFFERS_STORAGE_PATH, filename: OFFERS_FILENAME };
  }
  if (seed.id === FOUNDER_TRAP_PRODUCT_ID) {
    return { kind: "secure_file", storagePath: FOUNDER_TRAP_STORAGE_PATH, filename: FOUNDER_TRAP_FILENAME };
  }
  return { kind: "email_link", url: "", label: seed.label };
}

/** SOP Library products. The two paid guides and the free founder-trap guide are private PDFs. The dashboard link stays empty until an admin pastes it. */
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
      leadMagnet: seed.id === FOUNDER_TRAP_PRODUCT_ID,
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

/** Point an existing blueprint row at the private PDF without rewriting other products or turning the bump on. */
export async function syncBlueprintDelivery(store: CatalogStore): Promise<string[]> {
  const snapshot = await store.read();
  const current = snapshot.products.find((product) => product.id === BLUEPRINT_PRODUCT_ID);
  if (!current) return [];
  const delivery = current.delivery;
  if (
    delivery?.kind === "secure_file" &&
    delivery.storagePath === BLUEPRINT_STORAGE_PATH &&
    delivery.filename === BLUEPRINT_FILENAME
  ) {
    return [];
  }
  await store.updateProduct({
    ...current,
    entitlementProduct: null,
    orderBump: current.orderBump,
    delivery: { kind: "secure_file", storagePath: BLUEPRINT_STORAGE_PATH, filename: BLUEPRINT_FILENAME },
  });
  return [BLUEPRINT_PRODUCT_ID];
}

/** Point an existing offers row at the private PDF and the confirmed $19.99 price. */
export async function syncOffersDelivery(store: CatalogStore): Promise<string[]> {
  const snapshot = await store.read();
  const current = snapshot.products.find((product) => product.id === OFFERS_PRODUCT_ID);
  if (!current) return [];
  const delivery = current.delivery;
  if (
    current.priceCents === OFFERS_PRICE_CENTS &&
    delivery?.kind === "secure_file" &&
    delivery.storagePath === OFFERS_STORAGE_PATH &&
    delivery.filename === OFFERS_FILENAME
  ) {
    return [];
  }
  await store.updateProduct({
    ...current,
    priceCents: OFFERS_PRICE_CENTS,
    entitlementProduct: null,
    orderBump: current.orderBump,
    delivery: { kind: "secure_file", storagePath: OFFERS_STORAGE_PATH, filename: OFFERS_FILENAME },
  });
  return [OFFERS_PRODUCT_ID];
}

/** Point an existing founder-trap row at the free private PDF without rewriting other products. */
export async function syncFounderTrapDelivery(store: CatalogStore): Promise<string[]> {
  const snapshot = await store.read();
  const current = snapshot.products.find((product) => product.id === FOUNDER_TRAP_PRODUCT_ID);
  if (!current) return [];
  const delivery = current.delivery;
  if (
    current.leadMagnet &&
    current.priceCents === 0 &&
    delivery?.kind === "secure_file" &&
    delivery.storagePath === FOUNDER_TRAP_STORAGE_PATH &&
    delivery.filename === FOUNDER_TRAP_FILENAME
  ) {
    return [];
  }
  await store.updateProduct({
    ...current,
    priceCents: 0,
    leadMagnet: true,
    entitlementProduct: null,
    orderBump: current.orderBump,
    delivery: {
      kind: "secure_file",
      storagePath: FOUNDER_TRAP_STORAGE_PATH,
      filename: FOUNDER_TRAP_FILENAME,
    },
  });
  return [FOUNDER_TRAP_PRODUCT_ID];
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
      label:
        product.delivery?.kind === "email_link"
          ? product.delivery.label.trim() || "Open the policy tool"
          : "Open the policy tool",
    },
  };
}
