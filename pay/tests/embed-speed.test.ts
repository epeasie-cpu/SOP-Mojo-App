import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("embed slide-out speed", () => {
  it("opens the panel on click and animates it without waiting on the product fetch", () => {
    const embed = readFileSync(path.join(root, "public/embed.js"), "utf8");
    const clickAt = embed.indexOf('document.addEventListener(\n    "click"');
    const click = embed.slice(clickAt);
    expect(click).toContain("openPanel(slug)");
    expect(click).not.toContain(".then(");
    expect(embed).toContain("translate3d(100%,0,0)");
    expect(embed).toContain("280ms ease-out");
    expect(embed).toContain("prefers-reduced-motion: reduce");
    expect(embed).toContain('hint("preconnect", origin');
    expect(embed).toContain('hint("preconnect", "https://js.stripe.com"');
    expect(embed).toContain('hint("preload", "https://js.stripe.com/v3", "script"');
    expect(embed).toContain("/api/products/");
    expect(embed).toContain("preloadFrame");
    expect(embed).toContain("data-skeleton-title");
    expect(embed).toContain("sop-pay-progress");
    expect(embed).toContain('event.data !== "ready"');
    expect(embed).toContain('frame.allow = "payment"');
  });

  it("server-renders embed checkout and signals when the Payment Element is ready", () => {
    const page = readFileSync(path.join(root, "app/checkout/[slug]/page.tsx"), "utf8");
    const ui = readFileSync(path.join(root, "components/CheckoutExperience.tsx"), "utf8");
    expect(page).toContain("Suspense");
    expect(page).toContain("CheckoutProductFallback");
    expect(page).toContain('href="https://js.stripe.com/v3"');
    expect(page).toContain("openCheckoutSession");
    expect(page).toContain("email: null");
    expect(ui).toContain('postMessage("ready"');
    expect(ui).toContain("onReady");
    expect(ui).toContain('wallets: { applePay: "auto", googlePay: "auto" }');
  });
});
