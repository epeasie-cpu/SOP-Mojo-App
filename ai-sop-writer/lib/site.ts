export const SITE = {
  name: "AI SOP Writer",
  parentName: "SOP Mojo",
  host: "https://writer.sopmojo.com",
  parent: "https://www.sopmojo.com",
  builder: "https://builder.sopmojo.com",
  library: "https://www.sopmojo.com/soplibrary",
  founderEmail: "ryan@sopmojo.com",
  founderName: "Ryan Pease",
  tagline: "AI writes a first-draft standard operating procedure.",
  banner:
    "First draft — review with the process owner before you train anyone.",
} as const;

export type SiteConfig = typeof SITE;

export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return SITE.host;
  return `${SITE.host}${path.startsWith("/") ? path : `/${path}`}`;
}
