export const SITE = {
  name: "AI SOP Writer",
  parentName: "SOP Mojo",
  host: "https://writer.sopmojo.com",
  parent: "https://www.sopmojo.com",
  builder: "https://builder.sopmojo.com",
  library: "https://www.sopmojo.com/soplibrary",
  upgradeLp: "https://www.sopmojo.com/lp/ai-sop-writer",
  founderEmail: "ryan@sopmojo.com",
  founderName: "Ryan Pease",
  tagline: "AI writes a first-draft standard operating procedure.",
  banner:
    "First draft — review with the process owner before you train anyone.",
} as const;

export type SiteConfig = typeof SITE;

/** Default UTMs for soft Writer → Builder Pro launch-LP links. Paid CTAs do not use these. */
export const WRITER_TO_BUILDER_UTM = {
  utm_source: "ai-sop-writer",
  utm_medium: "product",
  utm_campaign: "writer_to_builder",
} as const;

/** Locked SamCart Slide Checkout for hard $39 Builder Pro buy / upgrade CTAs. */
export const WRITER_UPGRADE_URL =
  "https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left";

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE.host;
  return `${SITE.host}${path.startsWith("/") ? path : `/${path}`}`;
}

export function hostLabel(url: string = SITE.host): string {
  return new URL(url).host.replace(/^www\./, "");
}
