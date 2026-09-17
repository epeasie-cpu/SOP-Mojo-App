export const SITE = {
  name: "Client Systems",
  parentName: "SOP Mojo",
  host: "https://clients.sopmojo.com",
  parent: "https://www.sopmojo.com",
  writer: "https://writer.sopmojo.com",
  builder: "https://builder.sopmojo.com",
  library: "https://www.sopmojo.com/soplibrary",
  upgradeLp: "https://www.sopmojo.com/lp/ai-sop-writer",
  founderEmail: "ryan@sopmojo.com",
  founderName: "Ryan Pease",
  tagline: "Run client onboarding in a SOP Mojo workspace — intake, handoff, access, board.",
} as const;

export type SiteConfig = typeof SITE;

export const WRITER_TO_BUILDER_UTM = {
  utm_source: "client-systems",
  utm_medium: "product",
  utm_campaign: "clients_to_builder",
} as const;

export const BUILDER_CTA_URL = `${SITE.upgradeLp}?utm_source=${WRITER_TO_BUILDER_UTM.utm_source}&utm_medium=${WRITER_TO_BUILDER_UTM.utm_medium}&utm_campaign=${WRITER_TO_BUILDER_UTM.utm_campaign}`;

export const WRITER_CTA_URL = `${SITE.writer}?utm_source=client-systems&utm_medium=product&utm_campaign=clients_to_writer`;

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE.host;
  return `${SITE.host}${path.startsWith("/") ? path : `/${path}`}`;
}

export function hostLabel(url: string = SITE.host): string {
  return new URL(url).host.replace(/^www\./, "");
}
