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
  "https://rpease1.mysamcart.com/checkout/sop-builder-pro";

export const PRICING = {
  free: "Create + iterate",
  unlockPrice: "$19",
  unlockLabel: "Optional $19 unlock",
  builderPrice: "$39/mo",
  builderCta: "Builder Pro $39/mo",
  builderLabel: "Builder Pro $39/mo includes flowchart print, export, and import",
} as const;

export function flowchartCheckoutUrl(): string {
  return process.env.NEXT_PUBLIC_FLOWCHART_CHECKOUT_URL?.trim() || "";
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

export function builderSendUrl(): string {
  const params = new URLSearchParams({
    utm_source: "flowchart-studio",
    utm_medium: "product",
    utm_campaign: "send_to_builder",
    import: "flowchart",
  });
  return `${SITE.builder}?${params.toString()}`;
}
