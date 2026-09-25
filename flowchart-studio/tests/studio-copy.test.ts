import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { UNLOCK_COPY } from "@/lib/entitlements";
import { PRICING } from "@/lib/site";

function readStudio(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("studio copy", () => {
  it("sells Flowchart Plus and Builder Pro as separate products", () => {
    expect(PRICING.builderPrice).toBe("$39/mo");
    expect(PRICING.builderCta).toBe("Builder Pro $39/mo");
    expect(PRICING.builderLabel).toMatch(/\$39\/mo/);
    expect(PRICING.builderLabel).toMatch(/Export to Builder Pro/);
    expect(PRICING.unlockLabel).toBe("Flowchart Plus $19");
    expect(PRICING.unlockDetail).toMatch(/does not include Export to Builder Pro/i);
    expect(UNLOCK_COPY.headline).toBe("Unlock print and export");
    expect(UNLOCK_COPY.sendHeadline).toBe("Export to Builder Pro");
    expect(UNLOCK_COPY.builder).toMatch(/\$39\/mo/);
    expect(UNLOCK_COPY.send).toMatch(/Flowchart Plus does not include/);
  });

  it("keeps real checkout links and drops the honor-system unlock", () => {
    const source = readStudio("components/UnlockModal.tsx");
    expect(source).toContain("PRICING.builderCta");
    expect(source).toContain("UNLOCK_COPY.flowchartPlus");
    expect(source).not.toContain("$47");
    expect(source).not.toContain("I have Builder Pro");
    expect(source).not.toContain("Unlock this browser");
    expect(source).not.toContain("onUnlockBrowser");
    expect(source).toContain("Already purchased? Sign in");
    expect(source).toContain("href={flowchartUrl}");
    expect(source).toContain("href={builderUrl}");
  });

  it("loads SamCart Slide Checkout once in the root layout", () => {
    const source = readStudio("app/layout.tsx");
    expect(source).toContain("SAMCART_SLIDE_SCRIPT");
    expect(source).toContain('strategy="afterInteractive"');
  });

  it("gates print, export, and send in the toolbar", () => {
    const source = readStudio("components/Toolbar.tsx");
    expect(source).toContain("Print");
    expect(source).toContain("Export");
    expect(source).toContain("Export to Builder Pro");
    expect(source).toContain("Sign in");
    expect(source).toContain("UNLOCK_COPY.lockedLabel");
  });

  it("drops $47 one-time framing from studio copy", () => {
    const files = [
      "lib/site.ts",
      "lib/entitlements.ts",
      "lib/jsonld.ts",
      "lib/xml.ts",
      "components/Header.tsx",
      "components/UnlockModal.tsx",
      "components/Toolbar.tsx",
      "app/how-it-works/page.tsx",
      "README.md",
    ];
    for (const file of files) {
      expect(readStudio(file), file).not.toMatch(/\$47/);
    }
  });
});
