/** Free lead-magnet pages share the site header. They do not show the /account link. */
const LEAD_MAGNET_PATHS = [
  "/quality-management-software-fit-check",
  "/free/qms-check",
  "/acceptable-use-policy-generator",
  "/free/aup-generator",
  "/escape-the-founder-trap",
  "/free/founder-trap",
] as const;

export function hidesAccountHeaderLink(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "/").replace(/\/+$/, "") || "/";
  return LEAD_MAGNET_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
