import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("capture dock", () => {
  it("keeps one photo button that offers take photo and add photo", () => {
    const source = readFileSync(path.join(process.cwd(), "components/InputDock.tsx"), "utf8");
    expect(source).toContain("Map it");
    expect(source).toContain("process-text");
    expect(source).toContain("foldSpeechResults");
    expect(source).toContain("continuous = true");
    expect(source).toMatch(/>\s*Photo\s*</);
    expect(source).toContain("Take Photo");
    expect(source).toContain("Add Photo");
    expect(source).toContain("getUserMedia");
    expect(source).not.toContain("Snap photo");
    expect(source).not.toContain("Upload photo");
    expect(source.match(/type="file"/g)?.length).toBe(2);
    expect(source.match(/capture="environment"/g)?.length).toBe(1);
  });
});
