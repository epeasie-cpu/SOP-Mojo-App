import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { otherProductLinks, shareClipboardText, successHeadline } from "@/lib/success";
import { seedProducts } from "@/lib/seed";

describe("post-pay success page", () => {
  it("names the bought product and does not link into the apps", () => {
    const page = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/complete/page.tsx"), "utf8");
    const share = readFileSync(path.join(process.cwd(), "components/ShareProduct.tsx"), "utf8");
    expect(page).toContain("checkoutMetadata");
    expect(page).toContain("successHeadline");
    expect(page).toContain("Check your email for your username and password.");
    expect(page).toContain("Check your junk and spam folder too.");
    expect(page).toContain("Other SOP Mojo products");
    expect(page).not.toContain("Open Flowchart Studio");
    expect(page).not.toContain("Open Builder Pro");
    expect(page).not.toContain("flowchart.sopmojo.com");
    expect(page).not.toContain("builder.sopmojo.com");
    expect(share).toContain("navigator.share");
    expect(share).toContain("navigator.clipboard.writeText");
    expect(share).toContain("Share with a friend");
  });

  it("builds the headline, share text, and other-product links", () => {
    const [flowchart, builder] = seedProducts();
    expect(successHeadline(flowchart!.title)).toBe("Payment succeeded for Flowchart Plus.");
    expect(shareClipboardText("Flowchart Plus", "https://sop-mojo-pay.vercel.app/p/flowchart_plus")).toBe(
      "Check out Flowchart Plus from SOP Mojo. https://sop-mojo-pay.vercel.app/p/flowchart_plus",
    );
    const links = otherProductLinks([flowchart!, builder!], "flowchart_plus");
    expect(links).toEqual([{ title: "Builder Pro", href: "/p/builder_pro" }]);
    const hidden = otherProductLinks([{ ...builder!, active: false }], "flowchart_plus");
    expect(hidden).toEqual([{ title: "Builder Pro", href: "https://www.sopmojo.com" }]);
  });
});
