export const ENTITLEMENT_PRODUCTS = ["flowchart_plus", "builder_pro"] as const;

export type EntitlementProduct = (typeof ENTITLEMENT_PRODUCTS)[number];

export type OrderBump = {
  title: string;
  description: string;
  priceCents: number;
  entitlementProduct: EntitlementProduct | null;
};

export type AnnualOption = {
  priceCents: number;
  label: string;
};

export type ProductSeo = {
  title: string;
  description: string;
  jsonLd: string;
};

export type Product = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  currency: "usd";
  imageUrl: string;
  billing: "once" | "month";
  annual: AnnualOption | null;
  orderBump: OrderBump | null;
  presentation: "page" | "panel";
  entitlementProduct: EntitlementProduct | null;
  seo: ProductSeo;
  active: boolean;
};

export type PaySettings = {
  stripeMode: "test" | "live";
  /** Set when Stripe Tax could not be applied. Null when tax is on or untested. */
  taxNotice: string | null;
};

export type CatalogSnapshot = {
  products: Product[];
  settings: PaySettings;
};

export const DEFAULT_SETTINGS: PaySettings = {
  stripeMode: "test",
  taxNotice: null,
};

const SLUG = /^[a-z][a-z0-9_]{1,64}$/;

export function isEntitlementProduct(value: string): value is EntitlementProduct {
  return (ENTITLEMENT_PRODUCTS as readonly string[]).includes(value);
}

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function centsFromDollars(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const cents = Math.round(value * 100);
    return cents >= 50 ? cents : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const cents = Math.round(Number(trimmed) * 100);
  return cents >= 50 ? cents : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

export function parseProduct(value: unknown): Product {
  const row = asRecord(value);
  if (!row) throw new Error("A product must be an object.");
  const id = requiredString(row.id, "Product id").toLowerCase();
  if (!SLUG.test(id)) {
    throw new Error("Product id must be a slug like flowchart_plus (letters, numbers, underscores).");
  }
  const priceCents = typeof row.priceCents === "number" ? Math.round(row.priceCents) : centsFromDollars(row.price);
  if (!priceCents || priceCents < 50) throw new Error(`${id}: price must be at least $0.50.`);
  const billing = row.billing === "month" ? "month" : row.billing === "once" ? "once" : null;
  if (!billing) throw new Error(`${id}: billing must be once or month.`);
  const presentation = row.presentation === "panel" ? "panel" : row.presentation === "page" ? "page" : null;
  if (!presentation) throw new Error(`${id}: presentation must be page or panel.`);
  const entitlementRaw = typeof row.entitlementProduct === "string" ? row.entitlementProduct.trim() : "";
  const entitlementProduct = entitlementRaw
    ? isEntitlementProduct(entitlementRaw)
      ? entitlementRaw
      : null
    : null;
  if (entitlementRaw && !entitlementProduct) {
    throw new Error(`${id}: entitlement must be flowchart_plus, builder_pro, or empty.`);
  }
  const annual = parseAnnual(row.annual, billing, id);
  const orderBump = parseBump(row.orderBump, id);
  const seoRaw = asRecord(row.seo) ?? {};
  const jsonLd = typeof seoRaw.jsonLd === "string" ? seoRaw.jsonLd.trim() : "";
  if (jsonLd) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonLd);
    } catch {
      throw new Error(`${id}: SEO JSON-LD must be valid JSON.`);
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`${id}: SEO JSON-LD must be a JSON object.`);
    }
  }
  const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl.trim() : "";
  if (imageUrl.length > 120_000) throw new Error(`${id}: image is too large.`);
  if (imageUrl && !/^https?:\/\//.test(imageUrl) && !imageUrl.startsWith("/") && !imageUrl.startsWith("data:image/")) {
    throw new Error(`${id}: image must be a URL or an uploaded image.`);
  }
  return {
    id,
    title: requiredString(row.title, `${id} title`),
    description: requiredString(row.description, `${id} description`),
    priceCents,
    currency: "usd",
    imageUrl,
    billing,
    annual,
    orderBump,
    presentation,
    entitlementProduct,
    seo: {
      title: typeof seoRaw.title === "string" ? seoRaw.title.trim() : "",
      description: typeof seoRaw.description === "string" ? seoRaw.description.trim() : "",
      jsonLd,
    },
    active: row.active !== false,
  };
}

function parseAnnual(value: unknown, billing: "once" | "month", id: string): AnnualOption | null {
  if (value == null || value === false) return null;
  const row = asRecord(value);
  if (!row) return null;
  if (billing !== "month") throw new Error(`${id}: an annual option is only for monthly products.`);
  const priceCents =
    typeof row.priceCents === "number" ? Math.round(row.priceCents) : centsFromDollars(row.price);
  if (!priceCents) throw new Error(`${id}: annual price must be at least $0.50.`);
  const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : "Pay annually";
  return { priceCents, label };
}

function parseBump(value: unknown, id: string): OrderBump | null {
  if (value == null || value === false) return null;
  const row = asRecord(value);
  if (!row) return null;
  const priceCents =
    typeof row.priceCents === "number" ? Math.round(row.priceCents) : centsFromDollars(row.price);
  if (!priceCents) throw new Error(`${id}: order bump price must be at least $0.50.`);
  const entitlementRaw =
    typeof row.entitlementProduct === "string" ? row.entitlementProduct.trim() : "";
  if (entitlementRaw && !isEntitlementProduct(entitlementRaw)) {
    throw new Error(`${id}: order bump entitlement must be flowchart_plus, builder_pro, or empty.`);
  }
  return {
    title: requiredString(row.title, `${id} order bump title`),
    description: typeof row.description === "string" ? row.description.trim() : "",
    priceCents,
    entitlementProduct: entitlementRaw ? (entitlementRaw as EntitlementProduct) : null,
  };
}

export function parseSettings(value: unknown): PaySettings {
  const row = asRecord(value) ?? {};
  const stripeMode = row.stripeMode === "live" ? "live" : "test";
  const taxNotice = typeof row.taxNotice === "string" && row.taxNotice.trim() ? row.taxNotice.trim() : null;
  return { stripeMode, taxNotice };
}

export function parseCatalog(value: unknown): CatalogSnapshot {
  const row = asRecord(value);
  if (!row || !Array.isArray(row.products)) throw new Error("Catalog products must be a list.");
  const products = row.products.map((product) => parseProduct(product));
  const ids = new Set<string>();
  for (const product of products) {
    if (ids.has(product.id)) throw new Error(`Duplicate product id ${product.id}.`);
    ids.add(product.id);
  }
  return { products, settings: parseSettings(row.settings) };
}

export function productJsonLd(product: Product, pageUrl: string): string {
  if (product.seo.jsonLd) return product.seo.jsonLd;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.seo.description || product.description,
    image: product.imageUrl.startsWith("http") ? product.imageUrl : undefined,
    brand: { "@type": "Brand", name: "SOP Mojo" },
    offers: {
      "@type": "Offer",
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: pageUrl,
    },
  });
}
