import { absoluteUrl, publicOrigin } from "./site";

export function stablePath(productId: string): string {
  return `/go/${encodeURIComponent(productId)}`;
}

export function checkoutPath(productId: string): string {
  return `/checkout/${encodeURIComponent(productId)}`;
}

export function productPath(productId: string): string {
  return `/p/${encodeURIComponent(productId)}`;
}

export function stableUrl(productId: string, env?: NodeJS.ProcessEnv): string {
  return absoluteUrl(stablePath(productId), env);
}

export function embedSnippet(productId: string, label: string, env?: NodeJS.ProcessEnv): string {
  const origin = publicOrigin(env);
  const href = stableUrl(productId, env);
  const text = label.trim() || "Buy now";
  return `<script async src="${origin}/embed.js"></script>\n<a href="${href}">${escapeHtml(text)}</a>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Return URL origin for Stripe. Canonical links stay on pay.sopmojo.com. */
export function allowedReturnOrigin(requested: string | null | undefined, requestHost: string): string {
  const fallback = "https://pay.sopmojo.com";
  if (!requested) return requestHost ? `${requestHost.includes("localhost") ? "http" : "https"}://${requestHost}` : fallback;
  try {
    const url = new URL(requested);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    const host = url.host;
    if (host === "pay.sopmojo.com" || host === requestHost) return url.origin;
    if (host.startsWith("localhost:") || host === "localhost" || host.startsWith("127.0.0.1")) {
      return url.origin;
    }
  } catch {
    return fallback;
  }
  return fallback;
}
