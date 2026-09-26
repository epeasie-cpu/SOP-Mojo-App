import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lockedAccountNotice } from "@/lib/entitlements";

function readStudio(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("unlock sign-in loop", () => {
  it("tells a signed-in buyer they still need Flowchart Plus or Builder Pro", () => {
    expect(lockedAccountNotice("buyer@example.com", "export")).toBe(
      "Signed in as buyer@example.com. This account does not have Flowchart Plus or Builder Pro yet.",
    );
    expect(lockedAccountNotice("buyer@example.com", "send")).toMatch(/Builder Pro yet/);
  });

  it("offers sign-in only when nobody is signed in", () => {
    const unlock = readStudio("components/UnlockModal.tsx");
    expect(unlock).toContain("const signedIn = accountEmail != null");
    expect(unlock).toContain("lockedAccountNotice(accountEmail, action)");
    expect(unlock).toContain("Use a different account");
    expect(unlock).toContain("onUseDifferentAccount");
    expect(unlock).toContain("Already purchased? Sign in");
    expect(unlock).toContain("onSignIn");
    expect(unlock).toContain("href={flowchartUrl}");
    expect(unlock).toContain("href={builderUrl}");
    expect(unlock).toContain("PRICING.builderCta");
    expect(unlock).toContain("UNLOCK_COPY.flowchartPlus");
    expect(unlock).not.toContain("flowchart-studio-unlocked");
    expect(unlock).not.toContain("Unlock this browser");

    const accountChoice = unlock.slice(unlock.lastIndexOf("{signedIn ? ("), unlock.indexOf("Keep editing free"));
    const signedInBranch = accountChoice.slice(0, accountChoice.indexOf(") : ("));
    const signedOutBranch = accountChoice.slice(accountChoice.indexOf(") : ("));
    expect(signedInBranch).toContain("Use a different account");
    expect(signedInBranch).toContain("onUseDifferentAccount");
    expect(signedInBranch).not.toContain("Already purchased? Sign in");
    expect(signedOutBranch).toContain("Already purchased? Sign in");
    expect(signedOutBranch).toContain("onClick={onSignIn}");
    expect(signedOutBranch).not.toContain("Use a different account");
  });

  it("signs out before a different account, then reopens unlock if still locked", () => {
    const app = readStudio("components/StudioApp.tsx");
    expect(app).toContain('accountEmail={session ? (session.email ?? "") : null}');
    expect(app).toContain("clearSession()");
    expect(app).toContain('void runPremium(action, "sign-in")');
    expect(app).toContain('if (purpose === "purchase")');
    expect(app).toContain("void reopenUnlockIfLocked(gateAction)");
    expect(app).toContain("noteLockedAfterSignIn(action)");
    expect(app).not.toContain("flowchart-studio-unlocked");
    expect(app).not.toContain("persistUnlock");

    const switchAccount = app.slice(
      app.indexOf("onUseDifferentAccount={() => {"),
      app.indexOf("key={signInNonce}"),
    );
    expect(switchAccount.indexOf("clearSession()")).toBeGreaterThan(-1);
    expect(switchAccount.indexOf("clearSession()")).toBeLessThan(switchAccount.indexOf("openAuth("));
    expect(switchAccount).toContain('openAuth(gateAction === "send" ? "export" : "purchase")');

    const signedIn = app.slice(
      app.indexOf("onSignedIn={(signedIn) => {"),
      app.indexOf("<LibraryModal"),
    );
    expect(signedIn.indexOf('void runPremium(action, "sign-in")')).toBeLessThan(
      signedIn.indexOf('if (purpose === "purchase")'),
    );
  });
});
