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

/** Default UTMs for Writer → Builder Pro launch LP. */
export const WRITER_TO_BUILDER_UTM = {
  utm_source: "ai-sop-writer",
  utm_medium: "product",
  utm_campaign: "writer_to_builder",
} as const;

/** Primary paid/upgrade CTA. Do not point product CTAs at SamCart or the alpha host. */
export const WRITER_UPGRADE_URL = `${SITE.upgradeLp}?utm_source=${WRITER_TO_BUILDER_UTM.utm_source}&utm_medium=${WRITER_TO_BUILDER_UTM.utm_medium}&utm_campaign=${WRITER_TO_BUILDER_UTM.utm_campaign}`;

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE.host;
  return `${SITE.host}${path.startsWith("/") ? path : `/${path}`}`;
}

export function hostLabel(url: string = SITE.host): string {
  return new URL(url).host.replace(/^www\./, "");
}
