import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("capture dock", () => {
  it("keeps writing, uses continuous folded voice, and offers snap plus upload", () => {
    const source = readFileSync(path.join(process.cwd(), "components/InputDock.tsx"), "utf8");
    expect(source).toContain("Map it");
    expect(source).toContain("process-text");
    expect(source).toContain("foldSpeechResults");
    expect(source).toContain("continuous = true");
    expect(source).toContain("Snap photo");
    expect(source).toContain("Upload photo");
    expect(source).toContain('capture="environment"');
    expect(source.match(/type="file"/g)?.length).toBe(2);
    expect(source.match(/capture="environment"/g)?.length).toBe(1);
  });
});
