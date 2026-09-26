import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { emptyGraph } from "@/lib/graph";
import { mapNeedsAccountToKeep } from "@/lib/keep-map";

function readStudio(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("keep this map", () => {
  it("prompts only when the local map is worth keeping", () => {
    expect(mapNeedsAccountToKeep(emptyGraph())).toBe(false);
    expect(
      mapNeedsAccountToKeep({
        ...emptyGraph(),
        title: "Guest room turnover",
      }),
    ).toBe(true);
    expect(
      mapNeedsAccountToKeep({
        ...emptyGraph(),
        nodes: [
          ...emptyGraph().nodes,
          { id: "step-1", kind: "step", label: "Strip the bed", position: { x: 0, y: 0 } },
        ],
      }),
    ).toBe(true);
  });

  it("shows a dismissible sign-in prompt and does not unlock print", () => {
    const app = readStudio("components/StudioApp.tsx");
    const banner = readStudio("components/KeepMapBanner.tsx");
    const signIn = readStudio("components/SignInModal.tsx");
    expect(banner).toContain("Sign in to keep this map.");
    expect(banner).toContain("Not now");
    expect(banner).toContain("You can keep editing either way.");
    expect(app).toContain("keepReady && mapNeedsAccountToKeep(graph) && !session && !keepDismissed");
    expect(app).toContain('openAuth("keep")');
    expect(app).toContain("dismissKeepPrompt");
    expect(readStudio("lib/keep-map.ts")).toContain("KEEP_DISMISS_KEY");
    expect(signIn).toContain("Sign in to keep this map");
    expect(signIn).toContain("Creating an account does not unlock print or export.");
    expect(app).not.toContain("flowchart-studio-unlocked");
    expect(app).not.toContain("persistUnlock");

    const signedIn = app.slice(app.indexOf("onSignedIn={(signedIn) => {"), app.indexOf("<LibraryModal"));
    const keepBranch = signedIn.slice(
      signedIn.indexOf('if (purpose === "keep")'),
      signedIn.indexOf("const action = pendingAction.current"),
    );
    expect(keepBranch).toContain("notifyLeadCapture(signedIn)");
    expect(keepBranch).toContain("void saveKeptMap(signedIn)");
    expect(signedIn.indexOf('void runPremium(action, "sign-in")')).toBeLessThan(
      signedIn.indexOf('if (purpose === "purchase")'),
    );
    expect(signedIn.slice(signedIn.indexOf('if (purpose === "purchase")'))).not.toContain(
      "notifyLeadCapture",
    );
  });
});

describe("flowchart capture route", () => {
  it("tags flowchart from the Supabase access token and ignores a client-supplied tag", async () => {
    const route = readStudio("app/api/capture/route.ts");
    expect(route).toContain('tag: "flowchart"');
    expect(route).not.toContain("request.json");

    const previous = process.env.MAILCHIMP_API_KEY;
    delete process.env.MAILCHIMP_API_KEY;
    try {
      const { POST } = await import("@/app/api/capture/route");
      const response = await POST(
        new Request("http://localhost/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "stranger@example.com", tag: "samcart_pro" }),
        }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ ok: true, skipped: true });
    } finally {
      if (previous === undefined) delete process.env.MAILCHIMP_API_KEY;
      else process.env.MAILCHIMP_API_KEY = previous;
    }
  });
});
