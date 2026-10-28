import { SITE } from "./site";

/** Free lead-magnet pages share the site header. They do not show the /account link. */
const LEAD_MAGNET_PATHS = [
  "/quality-management-software-fit-check",
  "/free/qms-check",
  "/acceptable-use-policy-generator",
  "/free/aup-generator",
  "/escape-the-founder-trap",
  "/free/founder-trap",
  "/quality-control-starter-pack",
  "/2027-slp-cpt-kit",
  "/embed/demo",
] as const;

function cleanPath(pathname: string): string {
  const path = (pathname.split("?")[0] ?? "/").replace(/\/+$/, "") || "/";
  return path;
}

export function isLeadMagnetPath(pathname: string): boolean {
  const path = cleanPath(pathname);
  return LEAD_MAGNET_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function hidesAccountHeaderLink(pathname: string): boolean {
  return isLeadMagnetPath(pathname);
}

/** Free pages send the logo home to the marketing site. Other pages stay on this app. */
export function headerLogoHref(pathname: string): string {
  return isLeadMagnetPath(pathname) ? SITE.parent : "/";
}
