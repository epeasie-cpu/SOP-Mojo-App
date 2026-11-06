import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as robots } from "@/app/robots.txt/route";
import { proxy } from "@/proxy";
import { INDEX_ROBOTS, NOINDEX_HEADER, NOINDEX_ROBOTS, isNoIndexPath } from "@/lib/robots";
import { checkoutMetadata, productMetadata } from "@/lib/seo";

describe("checkout noindex", () => {
  it("sends X-Robots-Tag on the checkout step and not on the public product page", () => {
    const checkout = proxy(new NextRequest("https://pay.sopmojo.com/checkout/flowchart_plus"));
    expect(checkout.headers.get("x-robots-tag")).toBe(NOINDEX_HEADER);
    const embed = proxy(new NextRequest("https://pay.sopmojo.com/checkout/builder_pro?embed=1"));
    expect(embed.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const product = proxy(new NextRequest("https://pay.sopmojo.com/p/flowchart_plus"));
    expect(product.headers.get("x-robots-tag")).toBeNull();
    expect(isNoIndexPath("/p/flowchart_plus")).toBe(false);
    expect(isNoIndexPath("/checkout/flowchart_plus/complete")).toBe(true);
  });

  it("sets meta robots noindex on checkout and index on the public product page", () => {
    expect(checkoutMetadata("Flowchart Plus checkout").robots).toEqual(NOINDEX_ROBOTS);
    expect(
      productMetadata({
        path: "/p/flowchart_plus",
        title: "Flowchart Plus",
        description: "One-time unlock.",
      }).robots,
    ).toEqual(INDEX_ROBOTS);
  });

  it("disallows checkout in robots.txt and keeps product pages allowed", async () => {
    const response = robots();
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Disallow: /checkout");
    expect(body).toContain("Sitemap: https://pay.sopmojo.com/sitemap.xml");
    expect(body).not.toContain("Disallow: /p");
  });

  it("wires the checkout page to the noindex metadata helper", () => {
    const page = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/page.tsx"), "utf8");
    const layout = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/layout.tsx"), "utf8");
    const product = readFileSync(path.join(process.cwd(), "app/p/[slug]/page.tsx"), "utf8");
    expect(page).toContain("checkoutMetadata");
    expect(layout).toContain("checkoutMetadata");
    expect(product).toContain("application/ld+json");
    expect(product).not.toContain("checkoutMetadata");
  });
});
