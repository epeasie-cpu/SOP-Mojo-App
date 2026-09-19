import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("studio copy", () => {
  it("keeps Unlock $19 and Builder Pro $47 CTAs in the unlock modal", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/UnlockModal.tsx"),
      "utf8",
    );
    expect(source).toContain("Unlock $19");
    expect(source).toContain("Builder Pro $47 includes flowchart + import");
  });

  it("gates print, export, and send in the toolbar", () => {
    const source = readFileSync(path.join(process.cwd(), "components/Toolbar.tsx"), "utf8");
    expect(source).toContain("Print");
    expect(source).toContain("Export");
    expect(source).toContain("Send to Builder Pro");
  });
});
