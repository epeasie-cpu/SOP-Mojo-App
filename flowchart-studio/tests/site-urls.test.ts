import { describe, expect, it } from "vitest";
import {
  canUsePremium,
  parseUnlockFlag,
  readUnlockFromStorage,
  writeUnlockToStorage,
} from "@/lib/entitlements";
import {
  BUILDER_DEFAULT_CHECKOUT,
  FLOWCHART_DEFAULT_CHECKOUT,
  SAMCART_SLIDE_SCRIPT,
  SITE,
  builderCheckoutUrl,
  builderSendUrl,
  flowchartCheckoutUrl,
} from "@/lib/site";

describe("site urls", () => {
  it("pins the intended host and Builder checkout default", () => {
    expect(SITE.host).toBe("https://flowchart.sopmojo.com");
    expect(SITE.builder).toBe("https://builder.sopmojo.com");
    expect(BUILDER_DEFAULT_CHECKOUT).toBe(
      "https://rpease1.mysamcart.com/checkout/builder-pro#samcart-slide-open-left",
    );
    expect(builderCheckoutUrl()).toBe(BUILDER_DEFAULT_CHECKOUT);
    expect(builderCheckoutUrl()).not.toContain("sop-builder-pro");
  });

  it("resolves Flowchart+ checkout to the SamCart flowchart-studio product", () => {
    expect(FLOWCHART_DEFAULT_CHECKOUT).toBe(
      "https://rpease1.mysamcart.com/checkout/flowchart-studio",
    );
    expect(flowchartCheckoutUrl()).toBe(FLOWCHART_DEFAULT_CHECKOUT);
    expect(builderSendUrl()).toContain("import=flowchart");
    expect(builderSendUrl()).toContain("attach=step");
    const seamless = builderSendUrl({
      flowchartJson: "https://flowchart.sopmojo.com/api/handoff/h_abc",
      flowchartImage: "https://flowchart.sopmojo.com/api/handoff/h_abc/image",
      flowchartTitle: "Client onboarding",
      step: 2,
    });
    expect(seamless).toContain("import=flowchart");
    expect(seamless).toContain("flowchartJson=https%3A%2F%2Fflowchart.sopmojo.com%2Fapi%2Fhandoff%2Fh_abc");
    expect(seamless).toContain("flowchartImage=");
    expect(seamless).toContain("flowchartTitle=Client+onboarding");
    expect(seamless).toContain("step=2");
    expect(flowchartCheckoutUrl()).toContain("/checkout/flowchart-studio");
    expect(SAMCART_SLIDE_SCRIPT).toBe(
      "https://static.samcart.com/checkouts/sc-slide-script.js",
    );
  });
});

describe("unlock stub", () => {
  it("gates print/export/send until unlocked", () => {
    const locked = parseUnlockFlag(null);
    expect(canUsePremium(locked)).toBe(false);
    expect(canUsePremium(parseUnlockFlag("1"))).toBe(true);
    expect(parseUnlockFlag("builder-pro").source).toBe("builder-pro");
  });

  it("round-trips localStorage flags", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    writeUnlockToStorage(storage, "standalone");
    expect(readUnlockFromStorage(storage)).toEqual({
      unlocked: true,
      source: "standalone",
    });
  });
});
