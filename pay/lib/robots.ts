/** Checkout, embed hops, admin, and account pages must not be indexed. */
export function isNoIndexPath(pathname: string): boolean {
  return (
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname === "/go" ||
    pathname.startsWith("/go/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/download" ||
    pathname.startsWith("/download/") ||
    pathname === "/free/aup-generator/ready" ||
    pathname === "/free/qms-check/ready" ||
    pathname === "/escape-the-founder-trap/ready" ||
    pathname === "/quality-control-starter-pack/ready" ||
    pathname === "/2027-slp-cpt-kit/ready" ||
    pathname === "/embed/demo" ||
    pathname.startsWith("/embed/demo/")
  );
}

export const NOINDEX_HEADER = "noindex, nofollow";

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
} as const;

export const INDEX_ROBOTS = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true },
} as const;
