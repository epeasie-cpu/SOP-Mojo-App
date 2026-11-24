export const SITE = {
  name: "AI SOP Writer",
  parentName: "SOP Mojo",
  legalName: "Mojo Business Solutions LLC",
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

/** Builder Pro checkout on pay.sopmojo.com (Stripe). Paid CTAs. No UTMs. */
export const WRITER_UPGRADE_URL = "https://pay.sopmojo.com/go/builder_pro";

/**
 * Primary "Try Builder" CTA. One constant so the upcoming trial path is a single edit.
 * https://builder.sopmojo.com/try is not live yet, so this stays on the Builder host.
 */
export const BUILDER_TRY_URL: string = SITE.builder;

/** SOP Starter Kit on the main site. */
export const STARTER_KIT_URL = "https://www.sopmojo.com/lp/sop-starter-kit";

/** Builder ingest for Writer usage events. One constant. Not live until that route ships. */
export const WRITER_EVENTS_URL = "https://builder.sopmojo.com/api/events";

/** Tracked Builder link for a template page. Paid checkout does not use this. */
export function builderTryUrl(content?: string): string {
  const url = new URL(BUILDER_TRY_URL);
  for (const [key, value] of Object.entries(WRITER_TO_BUILDER_UTM)) {
    url.searchParams.set(key, value);
  }
  if (content) url.searchParams.set("utm_content", content);
  return url.toString();
}

/**
 * Postal line for email and on-page capture footers.
 * Set BUSINESS_ADDRESS when the legal address is confirmed. Never invent one.
 */
export function emailFooterLines(env: NodeJS.ProcessEnv = process.env): string[] {
  const lines = [`SOP Mojo · ${SITE.legalName}`];
  const address = env.BUSINESS_ADDRESS?.replace(/[\r\n]+/g, ", ").trim();
  if (address) lines.push(address);
  lines.push(SITE.founderEmail);
  return lines;
}

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE.host;
  return `${SITE.host}${path.startsWith("/") ? path : `/${path}`}`;
}

export function hostLabel(url: string = SITE.host): string {
  return new URL(url).host.replace(/^www\./, "");
}
