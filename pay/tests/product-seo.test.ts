import { describe, expect, it } from "vitest";
import { parseCatalog, productJsonLd } from "@/lib/catalog";
import { derivedSeoDescription, derivedSeoTitle, followSeoCopy, type SeoSource } from "@/lib/product-seo";
import { checkoutMetadata } from "@/lib/seo";
import { seedProducts } from "@/lib/seed";
import { NOINDEX_ROBOTS } from "@/lib/robots";

const flowchartSource: SeoSource = {
  id: "flowchart_plus",
  title: "Flowchart Plus",
  description: "One-time unlock. Print and PNG/JSON export in Flowchart Studio.",
  priceCents: 1900,
  billing: "once",
  annualPriceCents: null,
  imageUrl: "/products/flowchart.svg",
};

describe("catalog SEO", () => {
  it("shows filled SEO fields for the seeded products", () => {
    const [flowchart, builder] = seedProducts();
    expect(flowchart?.seo.title).toContain("Flowchart Plus");
    expect(flowchart?.seo.description).toContain("$19");
    expect(builder?.seo.title).toContain("Builder Pro");
    expect(builder?.seo.description).toContain("$39");
    expect(builder?.seo.description).toContain("$390");
  });

  it("fills a blank SEO title, description, and JSON-LD from the product", () => {
    const flowchart = seedProducts()[0]!;
    const parsed = parseCatalog({
      products: [{ ...flowchart, seo: { title: "", description: "", jsonLd: "" } }],
      settings: { stripeMode: "test", taxNotice: null },
    }).products[0]!;
    expect(parsed.seo.title).toBe("Flowchart Plus — $19 one-time | SOP Mojo");
    expect(parsed.seo.description).toContain("One-time unlock");
    expect(parsed.seo.description).toContain("$19 one-time");
    const json = JSON.parse(parsed.seo.jsonLd) as { name: string; offers: { price: string; url: string } };
    expect(json.name).toBe("Flowchart Plus");
    expect(json.offers.price).toBe("19.00");
    expect(json.offers.url).toBe("https://pay.sopmojo.com/p/flowchart_plus");
  });

  it("keeps a hand-edited SEO title and description when the price changes", () => {
    const next = { ...flowchartSource, priceCents: 2500 };
    const kept = followSeoCopy({
      previous: flowchartSource,
      next,
      seoTitle: "Flowchart Plus — $19 one-time unlock | SOP Mojo",
      seoDescription: "Custom description for the public page.",
    });
    expect(kept.seoTitle).toBe("Flowchart Plus — $19 one-time unlock | SOP Mojo");
    expect(kept.seoDescription).toBe("Custom description for the public page.");
  });

  it("follows title, description, and price again when the SEO field still matches the generated copy or is cleared", () => {
    const next = {
      ...flowchartSource,
      title: "Flowchart Plus Export",
      description: "Print and export.",
      priceCents: 2500,
    };
    const following = followSeoCopy({
      previous: flowchartSource,
      next,
      seoTitle: derivedSeoTitle(flowchartSource),
      seoDescription: derivedSeoDescription(flowchartSource),
    });
    expect(following.seoTitle).toBe("Flowchart Plus Export — $25 one-time | SOP Mojo");
    expect(following.seoDescription).toBe("Print and export. $25 one-time.");
    const cleared = followSeoCopy({
      previous: flowchartSource,
      next,
      seoTitle: "   ",
      seoDescription: "",
    });
    expect(cleared).toEqual(following);
  });

  it("generates public-page JSON-LD from the product and leaves checkout noindex", () => {
    const product = seedProducts()[0]!;
    const json = JSON.parse(
      productJsonLd(
        { ...product, seo: { title: product.seo.title, description: product.seo.description, jsonLd: "{\"stale\":true}" } },
        "https://pay.sopmojo.com/p/flowchart_plus",
      ),
    ) as { description: string; offers: { url: string }; stale?: boolean };
    expect(json.description).toBe(product.description);
    expect(json.offers.url).toBe("https://pay.sopmojo.com/p/flowchart_plus");
    expect(json.stale).toBeUndefined();
    expect(checkoutMetadata("Checkout").robots).toEqual(NOINDEX_ROBOTS);
  });
});
