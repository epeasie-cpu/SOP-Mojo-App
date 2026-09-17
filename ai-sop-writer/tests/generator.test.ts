import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("generator result UI", () => {
  const source = readFileSync(
    path.join(process.cwd(), "components/Generator.tsx"),
    "utf8",
  );

  it("keeps copy, print, download, and Copy AI prompt ungated", () => {
    expect(source).toContain("Copy Markdown");
    expect(source).toContain("Copy AI prompt");
    expect(source).toContain("Print");
    expect(source).toContain("Download Markdown");
    expect(source).toContain("Download print HTML");
  });

  it("has no email capture form or ESP-implying copy", () => {
    expect(source).not.toContain("capture-email");
    expect(source).not.toContain("Save email");
    expect(source).not.toMatch(/save your email locally/i);
    expect(source).not.toMatch(/email service provider/i);
    expect(source).not.toMatch(/Logged on this server/i);
    expect(source).not.toContain('type="email"');
  });
});
