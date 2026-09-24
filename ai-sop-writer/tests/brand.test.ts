import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("SOP Mojo family branding", () => {
  const root = process.cwd();
  const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
  const header = readFileSync(path.join(root, "components/Header.tsx"), "utf8");
  const cta = readFileSync(path.join(root, "components/CtaRow.tsx"), "utf8");
  const generator = readFileSync(path.join(root, "components/Generator.tsx"), "utf8");

  it("uses the shared lime and zinc tokens from Flowchart Studio and Builder Pro", () => {
    expect(css).toContain("--lime: #b0ff56");
    expect(css).toContain("--lime-ink: #10140c");
    expect(css).toContain("--zinc: #09090b");
    expect(css).not.toContain("#c6ff4a");
    expect(css).not.toContain("#f6f4ec");
  });

  it("keeps the free Writer → Builder upgrade URL on the chrome CTAs", () => {
    expect(header).toContain("WRITER_UPGRADE_URL");
    expect(header).toContain("Get Builder Pro");
    expect(cta).toContain("WRITER_UPGRADE_URL");
    expect(cta).toContain("Get Builder Pro");
    expect(generator).toContain("WRITER_UPGRADE_URL");
    expect(generator).not.toContain("mysamcart.com");
  });
});
