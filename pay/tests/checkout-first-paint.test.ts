import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hydrateBuyerEmail } from "@/lib/hydrate-buyer";
import type { IncomingStripeEvent } from "@/lib/stripe-events";

const root = process.cwd();

describe("payment fields on first paint", () => {
  it("mounts the Payment Element with the email field and does not wait to create Stripe", () => {
    const page = readFileSync(path.join(root, "app/checkout/[slug]/page.tsx"), "utf8");
    const ui = readFileSync(path.join(root, "components/CheckoutExperience.tsx"), "utf8");
    const embed = readFileSync(path.join(root, "public/embed.js"), "utf8");
    expect(page).toContain("openCheckoutSession");
    expect(page).toContain("email: null");
    expect(page).toContain("clientSecret");
    expect(embed).toContain("embed=1");
    const screen = ui.slice(ui.indexOf("export function CheckoutExperience"));
    expect(screen.indexOf('id="buyer-email"')).toBeGreaterThan(-1);
    expect(screen.indexOf("product.annual")).toBeGreaterThan(screen.indexOf('id="buyer-email"'));
    expect(screen.indexOf("product.orderBump")).toBeGreaterThan(screen.indexOf("product.annual"));
    expect(screen.indexOf("data-payment-slot")).toBeGreaterThan(screen.indexOf("product.orderBump"));
    expect(screen).toContain("<PayFields");
    expect(ui).toContain("<PaymentElement");
    expect(ui).toContain('wallets: { applePay: "auto", googlePay: "auto" }');
    expect(ui).toContain("updateEmail");
    expect(ui).toContain("runServerUpdate");
    expect(ui).toContain("disabled={pending || !ready || !buyer}");
    expect(ui).not.toContain("Enter your email to load");
    expect(ui).not.toContain("setClientSecret");
  });

  it("keeps a known buyer email and skips lookup when Stripe is not configured", async () => {
    const present: IncomingStripeEvent = {
      id: "evt_present",
      type: "checkout.session.completed",
      data: {
        object: {
          customer_details: { email: "buyer@example.com" },
          metadata: { entitlements: "flowchart_plus", email: "buyer@example.com" },
        },
      },
    };
    await hydrateBuyerEmail(present, {} as unknown as NodeJS.ProcessEnv);
    expect(present.data.object.metadata).toMatchObject({ email: "buyer@example.com" });

    const missing: IncomingStripeEvent = {
      id: "evt_missing",
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_123", metadata: { entitlements: "builder_pro" } } },
    };
    await hydrateBuyerEmail(missing, {} as unknown as NodeJS.ProcessEnv);
    expect(missing.data.object.metadata).toEqual({ entitlements: "builder_pro" });
  });
});
