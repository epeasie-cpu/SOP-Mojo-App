import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { UNLOCK_COPY } from "@/lib/entitlements";
import { PRICING } from "@/lib/site";

function readStudio(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("studio copy", () => {
  it("sells Builder Pro $39/mo as the primary unlock CTA", () => {
    expect(PRICING.builderPrice).toBe("$39/mo");
    expect(PRICING.builderCta).toBe("Builder Pro $39/mo");
    expect(PRICING.builderLabel).toMatch(/\$39\/mo/);
    expect(UNLOCK_COPY.headline).toBe("Unlock with Builder Pro");
    expect(UNLOCK_COPY.standalone).toMatch(/optional/i);
    expect(UNLOCK_COPY.builder).toMatch(/\$39\/mo/);
  });

  it("keeps Builder Pro primary and $19 secondary in the unlock modal", () => {
    const source = readStudio("components/UnlockModal.tsx");
    expect(source).toContain("PRICING.builderCta");
    expect(source).toContain("UNLOCK_COPY.standalone");
    expect(source).toContain("Unlock with Builder Pro");
    expect(source).not.toContain("$47");
    expect(source.indexOf("PRICING.builderCta")).toBeLessThan(
      source.indexOf("UNLOCK_COPY.standalone"),
    );
  });

  it("gates print, export, and send in the toolbar", () => {
    const source = readStudio("components/Toolbar.tsx");
    expect(source).toContain("Print");
    expect(source).toContain("Export");
    expect(source).toContain("Send to Builder Pro");
    expect(source).toContain("UNLOCK_COPY.headline");
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
