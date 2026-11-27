import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { proxy } from "@/proxy";
import {
  AUP_CANONICAL_PATH,
  AUP_FAQ,
  AUP_NOT_LEGAL_ADVICE,
  AUP_OG_IMAGE_PATH,
  AUP_SEO_DESCRIPTION,
  AUP_SEO_H1,
  AUP_SEO_TITLE,
  AUP_SHARE_LINE,
  AUP_STEPS,
  aupFaqJsonLd,
  aupFormReturnPath,
  aupLandingMetadata,
  aupSoftwareJsonLd,
} from "@/lib/aup-landing";
import { isNoIndexPath, NOINDEX_HEADER } from "@/lib/robots";

describe("AUP landing SEO", () => {
  it("uses a keyword canonical URL, indexable metadata, and price 0", () => {
    expect(AUP_SEO_TITLE).toBe("Free Acceptable Use Policy Generator | SOP Mojo");
    expect(AUP_SEO_DESCRIPTION).toBe(
      "Free acceptable use policy generator for small businesses. Draft a template covering devices, email, internet, data, and BYOD. We email your access link.",
    );
    expect(AUP_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
    const meta = aupLandingMetadata();
    expect(meta.title).toBe(AUP_SEO_TITLE);
    expect(meta.description).toBe(AUP_SEO_DESCRIPTION);
    expect(meta.alternates).toEqual({ canonical: "https://pay.sopmojo.com/acceptable-use-policy-generator" });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.openGraph).toMatchObject({
      title: AUP_SEO_TITLE,
      description: AUP_SEO_DESCRIPTION,
      url: "https://pay.sopmojo.com/acceptable-use-policy-generator",
      images: [{ url: `https://pay.sopmojo.com${AUP_OG_IMAGE_PATH}`, width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: AUP_SEO_TITLE,
      description: AUP_SEO_DESCRIPTION,
      images: [`https://pay.sopmojo.com${AUP_OG_IMAGE_PATH}`],
    });
    const software = aupSoftwareJsonLd();
    expect(software["@type"]).toBe("SoftwareApplication");
    expect(software.offers).toEqual({ "@type": "Offer", price: "0", priceCurrency: "USD" });
    const faq = aupFaqJsonLd();
    const questions = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(questions.length).toBeGreaterThanOrEqual(5);
    expect(questions.length).toBeLessThanOrEqual(7);
    expect(questions.map((item) => item.name)).toEqual(AUP_FAQ.map((item) => item.question));
    expect(questions.map((item) => item.acceptedAnswer.text)).toEqual(AUP_FAQ.map((item) => item.answer));
    expect(faq["@type"]).toBe("FAQPage");
    expect(AUP_NOT_LEGAL_ADVICE.startsWith("This is not legal advice.")).toBe(true);
    expect(AUP_SEO_H1).toBe("Free acceptable use policy generator");
    expect(AUP_SHARE_LINE).toBe("Know a business owner who needs one? Share this free tool");
    expect(AUP_STEPS).toHaveLength(3);
    expect(aupFormReturnPath("https://evil.example")).toBe("/free/aup-generator");
    expect(aupFormReturnPath(AUP_CANONICAL_PATH)).toBe(AUP_CANONICAL_PATH);
  });

  it("renders the form, outline, upsell, and share line on both URLs", () => {
    const landing = readFileSync(path.join(process.cwd(), "components/AupLanding.tsx"), "utf8");
    const share = readFileSync(path.join(process.cwd(), "components/AupShare.tsx"), "utf8");
    const free = readFileSync(path.join(process.cwd(), "app/free/aup-generator/page.tsx"), "utf8");
    const canonical = readFileSync(path.join(process.cwd(), "app/acceptable-use-policy-generator/page.tsx"), "utf8");
    const image = readFileSync(path.join(process.cwd(), "app/acceptable-use-policy-generator/opengraph-image.tsx"), "utf8");
    expect(landing.indexOf("<h1")).toBeLessThan(landing.indexOf("<form"));
    expect(landing.indexOf("<form")).toBeLessThan(landing.indexOf("What an acceptable use policy is"));
    expect(landing).toContain("{AUP_SEO_H1}");
    expect(landing).toContain("acceptable use policy template");
    expect(landing).toContain("AUP for a small business");
    expect(landing).toContain("IT acceptable use policy example");
    expect(landing).toContain("employee acceptable use policy");
    expect(landing).toContain("{AUP_NOT_LEGAL_ADVICE}");
    expect(landing).toContain("{AUP_FREE_UPSELL}");
    expect(landing).toContain("href={BUILDER_PRO_GO}");
    expect(landing).toContain("aupFaqJsonLd");
    expect(landing).not.toContain("testimonial");
    expect(share).toContain("{AUP_SHARE_LINE}");
    expect(share).toContain("navigator.clipboard");
    expect(share).toContain("navigator.share");
    expect(free).toContain("aupLandingMetadata");
    expect(free).toContain("<AupLanding");
    expect(canonical).toContain("aupLandingMetadata");
    expect(canonical).toContain("<AupLanding");
    expect(image).toContain("aupOpenGraphImage");
    expect(landing).toContain('name="email"');
    expect(landing.match(/type="submit"/g)).toHaveLength(1);
  });

  it("lists the canonical page in the sitemap and keeps checkout and admin out", async () => {
    const body = await (await sitemap()).text();
    expect(body).toContain("https://pay.sopmojo.com/acceptable-use-policy-generator");
    expect(body).toContain("https://pay.sopmojo.com/p/builder_pro");
    expect(body).not.toContain("/checkout");
    expect(body).not.toContain("/admin");
    expect(body).not.toContain("/p/aup_generator");
    const robotsBody = await robots().text();
    expect(robotsBody).toContain("Allow: /acceptable-use-policy-generator");
    expect(robotsBody).toContain("Allow: /free/aup-generator");
    expect(robotsBody).toContain("Disallow: /checkout");
    expect(robotsBody).toContain("Disallow: /admin");
    expect(robotsBody).toContain("Sitemap: https://pay.sopmojo.com/sitemap.xml");
    expect(isNoIndexPath("/acceptable-use-policy-generator")).toBe(false);
    expect(isNoIndexPath("/free/aup-generator")).toBe(false);
    expect(isNoIndexPath("/free/aup-generator/ready")).toBe(true);
    expect(isNoIndexPath("/checkout/builder_pro")).toBe(true);
    expect(isNoIndexPath("/admin")).toBe(true);
    const ready = proxy(new NextRequest("https://pay.sopmojo.com/free/aup-generator/ready"));
    expect(ready.headers.get("x-robots-tag")).toBe(NOINDEX_HEADER);
    const landing = proxy(new NextRequest("https://pay.sopmojo.com/acceptable-use-policy-generator"));
    expect(landing.headers.get("x-robots-tag")).toBeNull();
  });
});
