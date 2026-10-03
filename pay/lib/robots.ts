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
    pathname.startsWith("/api/")
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
