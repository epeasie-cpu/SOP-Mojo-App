import type { Product } from "./catalog";
import { productPath } from "./links";
import { ACCESS_LINK_ON_THE_WAY } from "./library";
import { SITE } from "./site";

export function deliveryLink(product: Product | null): { url: string; label: string } | null {
  if (product?.delivery?.kind !== "email_link") return null;
  const url = product.delivery.url.trim();
  if (!url) return null;
  return { url, label: product.delivery.label.trim() || "Download" };
}

export function paidDeliveryView(
  product: Product | null,
  accessUrl: string | null,
): { kind: "link"; url: string; label: string } | { kind: "pending"; message: string } | null {
  const link = deliveryLink(product);
  if (link) return { kind: "link", ...link };
  if (product?.delivery?.kind !== "make_webhook") return null;
  const url = accessUrl?.trim() ?? "";
  if (url.startsWith("https://")) {
    return { kind: "link", url, label: product.delivery.label.trim() || "Open the policy tool" };
  }
  return { kind: "pending", message: ACCESS_LINK_ON_THE_WAY };
}

export function successHeadline(title: string): string {
  const name = title.trim();
  return name ? `Payment succeeded for ${name}.` : "Payment succeeded.";
}

export function shareMessage(title: string, url: string): { text: string; url: string } {
  const name = title.trim() || "SOP Mojo";
  return { text: `Check out ${name} from SOP Mojo.`, url };
}

export function shareClipboardText(title: string, url: string): string {
  const message = shareMessage(title, url);
  return `${message.text} ${message.url}`;
}

/** Other catalog products. Active ones use the public /p page. The rest use the marketing site. */
export function otherProductLinks(products: Product[], currentId: string): { title: string; href: string }[] {
  const links = products
    .filter((product) => product.id !== currentId)
    .map((product) => ({
      title: product.title,
      href: product.active ? productPath(product.id) : SITE.parent,
    }));
  if (links.length === 0) return [{ title: SITE.parentName, href: SITE.parent }];
  return links;
}
