/** Who may iframe /checkout/[slug]?embed=1. Only frame-ancestors, so Stripe’s Payment Element and Apple Pay are unchanged. */
export const EMBED_FRAME_ANCESTORS = [
  "'self'",
  "https://www.sopmojo.com",
  "https://sopmojo.com",
  "https://*.framer.app",
  "https://*.framer.website",
  "https://framer.com",
  "https://*.framer.com",
] as const;

export function embedFramePolicy(): string {
  return `frame-ancestors ${EMBED_FRAME_ANCESTORS.join(" ")}`;
}

export function isEmbedCheckout(url: URL): boolean {
  return url.pathname.startsWith("/checkout/") && url.searchParams.get("embed") === "1";
}
