export const SITE = {
  name: "Flowchart Studio",
  parentName: "SOP Mojo",
  host: "https://flowchart.sopmojo.com",
  parent: "https://www.sopmojo.com",
  builder: "https://builder.sopmojo.com",
  library: "https://www.sopmojo.com/soplibrary",
  writer: "https://writer.sopmojo.com",
  founderEmail: "ryan@sopmojo.com",
  founderName: "Ryan Pease",
  tagline:
    "Turn handwriting, voice, or a pasted process into an editable AI flowchart — then send it to Builder Pro.",
  lime: "#B0FF56",
  limeInk: "#10140c",
  zinc: "#09090b",
} as const;

export type SiteConfig = typeof SITE;

export const BUILDER_DEFAULT_CHECKOUT =
  "https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left";

export const FLOWCHART_DEFAULT_CHECKOUT =
  "https://rpease1.mysamcart.com/checkout/flowchart-studio";

export const SAMCART_SLIDE_SCRIPT =
  "https://static.samcart.com/checkouts/sc-slide-script.js";

export const PRICING = {
  free: "Create + iterate",
  unlockPrice: "$19",
  unlockLabel: "Flowchart Plus $19",
  unlockDetail:
    "One-time. Print and PNG/JSON export. Does not include Export to Builder Pro.",
  builderPrice: "$39/mo",
  builderCta: "Builder Pro $39/mo",
  builderLabel: "Builder Pro $39/mo includes print, export, and Export to Builder Pro",
} as const;

export function flowchartCheckoutUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FLOWCHART_CHECKOUT_URL?.trim() ||
    FLOWCHART_DEFAULT_CHECKOUT
  );
}

export function builderCheckoutUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BUILDER_CHECKOUT_URL?.trim() ||
    BUILDER_DEFAULT_CHECKOUT
  );
}

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE.host;
  return `${SITE.host}${path.startsWith("/") ? path : `/${path}`}`;
}

export function hostLabel(url: string = SITE.host): string {
  return new URL(url).host.replace(/^www\./, "");
}

export type BuilderSendParams = {
  flowchartJson?: string;
  flowchartImage?: string;
  flowchartTitle?: string;
  step?: number;
};

/**
 * @deprecated Auto-spawn Send URL. Export uses the wizard and attach API.
 * Kept so older docs and tests can still describe the query shape.
 */
export function builderSendUrl(opts: BuilderSendParams = {}): string {
  const params = new URLSearchParams({
    utm_source: "flowchart-studio",
    utm_medium: "product",
    utm_campaign: "send_to_builder",
    import: "flowchart",
    attach: "step",
  });
  if (opts.flowchartJson) params.set("flowchartJson", opts.flowchartJson);
  if (opts.flowchartImage) params.set("flowchartImage", opts.flowchartImage);
  if (opts.flowchartTitle) params.set("flowchartTitle", opts.flowchartTitle);
  if (opts.step != null && Number.isFinite(opts.step) && opts.step >= 1) {
    params.set("step", String(Math.floor(opts.step)));
  }
  return `${SITE.builder}?${params.toString()}`;
}
