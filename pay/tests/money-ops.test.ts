import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET as applePayAssociation } from "@/app/.well-known/apple-developer-merchantid-domain-association/route";
import { assignRefundEntitlements } from "@/lib/hydrate-refund";
import { portalSessionParams, TEST_BILLING_PORTAL_CONFIGURATION_ID } from "@/lib/portal";
import { automaticTaxEnabled } from "@/lib/tax";

describe("tax, portal, wallets, and refunds", () => {
  it("does not request automatic tax while the test account is pending", () => {
    expect(automaticTaxEnabled()).toBe(false);
    const admin = readFileSync(path.join(process.cwd(), "components/AdminDashboard.tsx"), "utf8");
    const checkout = readFileSync(path.join(process.cwd(), "lib/open-checkout.ts"), "utf8");
    expect(admin).toContain("Test mode");
    expect(admin).toContain("Checkout is using Stripe test keys.");
    expect(admin).toContain("Checkout is using Stripe live keys (real charges).");
    expect(admin).toContain('stripeMode === "live"');
    expect(admin).not.toContain("Live keys are not set");
    expect(admin).not.toContain('onClick={() => void save(products, mode)}');
    expect(checkout).toContain("automaticTaxEnabled()");
    expect(checkout).not.toContain("tax/settings");
    expect(checkout).toContain("receipt_email");
    expect(checkout).toContain("customers.update");
  });

  it("opens the existing test portal configuration and does not create another", () => {
    const params = portalSessionParams({ customerId: "cus_123", mode: "test" });
    expect(params).toEqual({
      customer: "cus_123",
      return_url: "https://pay.sopmojo.com",
      configuration: TEST_BILLING_PORTAL_CONFIGURATION_ID,
    });
    expect(TEST_BILLING_PORTAL_CONFIGURATION_ID).toBe("bpc_1UMuOAQ8wI2jkOVGxwG9WvdF");
    const live = portalSessionParams({ customerId: "cus_123", mode: "live" });
    expect(live.configuration).toBeUndefined();
    const route = readFileSync(path.join(process.cwd(), "app/api/portal/route.ts"), "utf8");
    expect(route).toContain("portalSessionParams");
    expect(route).not.toContain("billingPortal.configurations.create");
    expect(route).toContain("PORTAL_OPEN_FAILED");
  });

  it("serves the Apple Pay association file and does not register another domain", async () => {
    const response = applePayAssociation();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/octet-stream");
    const body = await response.text();
    expect(body.startsWith("7B227073704964")).toBe(true);
    const source = readFileSync(
      path.join(process.cwd(), "app/.well-known/apple-developer-merchantid-domain-association/route.ts"),
      "utf8",
    );
    expect(source).not.toContain("applePayDomains");
    expect(source).not.toContain("example.com");
  });

  it("puts a plain terms line next to pay and keeps checkout noindex", () => {
    const screen = readFileSync(path.join(process.cwd(), "components/CheckoutExperience.tsx"), "utf8");
    const pay = screen.indexOf("payLabel");
    const terms = screen.indexOf("By paying, you agree to the");
    expect(terms).toBeGreaterThan(pay);
    expect(screen).toContain("A refund removes access for that product only.");
    expect(screen).toContain('href="/legal/terms"');
    expect(screen).toContain('href="/legal/refunds"');
    expect(screen).toContain('wallets: { applePay: "auto", googlePay: "auto" }');
    const page = readFileSync(path.join(process.cwd(), "app/checkout/[slug]/page.tsx"), "utf8");
    expect(page).toContain("checkoutMetadata");
  });

  it("copies only the refunded purchase from the first related object", () => {
    const charge: Record<string, unknown> = { metadata: {} };
    const products = assignRefundEntitlements(charge, [
      { metadata: { entitlements: "flowchart_plus", email: "buyer@example.com" } },
      { metadata: { entitlements: "builder_pro,flowchart_plus", email: "buyer@example.com" } },
    ]);
    expect(products).toEqual(["flowchart_plus"]);
    expect(charge.metadata).toEqual({ entitlements: "flowchart_plus", email: "buyer@example.com" });

    const named: Record<string, unknown> = { metadata: { entitlements: "builder_pro", email: "buyer@example.com" } };
    expect(
      assignRefundEntitlements(named, [{ metadata: { entitlements: "flowchart_plus" } }]),
    ).toEqual(["builder_pro"]);
    expect(named.metadata).toEqual({ entitlements: "builder_pro", email: "buyer@example.com" });
  });
});
