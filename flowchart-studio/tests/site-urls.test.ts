import { describe, expect, it } from "vitest";
import {
  canUsePremium,
  parseUnlockFlag,
  readUnlockFromStorage,
  writeUnlockToStorage,
} from "@/lib/entitlements";
import { builderCheckoutUrl, BUILDER_DEFAULT_CHECKOUT, SITE } from "@/lib/site";

describe("site urls", () => {
  it("pins the intended host and Builder checkout default", () => {
    expect(SITE.host).toBe("https://flowchart.sopmojo.com");
    expect(SITE.builder).toBe("https://builder.sopmojo.com");
    expect(builderCheckoutUrl()).toBe(BUILDER_DEFAULT_CHECKOUT);
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
