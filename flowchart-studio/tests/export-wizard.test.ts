import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("export wizard copy", () => {
  it("asks for an SOP, then a step, including its own step", () => {
    const source = readFileSync(path.join(process.cwd(), "components/ExportWizard.tsx"), "utf8");
    expect(source).toContain("Which SOP would you like to export this to?");
    expect(source).toContain("Which step would you like to add it to?");
    expect(source).toContain("Its Own Step");
    expect(source).toContain("Flowchart, click to open");
    expect(source).not.toContain("flowchartJson");
    expect(source).not.toContain("builderSendUrl");
  });

  it("prompts to sign in before export and library save", () => {
    const signIn = readFileSync(path.join(process.cwd(), "components/SignInModal.tsx"), "utf8");
    const app = readFileSync(path.join(process.cwd(), "components/StudioApp.tsx"), "utf8");
    expect(signIn).toContain("Sign in with your Builder Pro account before exporting this map.");
    expect(signIn).toContain("Sign in with your Builder Pro account to save this map to your library.");
    expect(app).toContain("openAuth(\"export\")");
    expect(app).toContain("openAuth(\"library\")");
  });
});
