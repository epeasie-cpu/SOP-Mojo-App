import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { OPTIONS, POST } from "@/app/api/lead/qc-pack/route";
import { GET as popupScript } from "@/app/embed/lead-popup.js/route";
import { proxy } from "@/proxy";
import {
  LEAD_POPUP_SNIPPET,
  leadPopupAllowedOrigin,
  leadPopupPathMatches,
  leadPopupScript,
} from "@/lib/lead-popup";
import { hidesAccountHeaderLink } from "@/lib/lead-pages";
import { isNoIndexPath, NOINDEX_HEADER } from "@/lib/robots";

describe("lead popup", () => {
  it("matches exact paths, prefixes, and a lone star", () => {
    const article = "/articles/quality-management-software";
    expect(leadPopupPathMatches(article, article)).toBe(true);
    expect(leadPopupPathMatches(`${article}/`, article)).toBe(true);
    expect(leadPopupPathMatches(`${article}/extra`, article)).toBe(false);
    expect(leadPopupPathMatches("/articles/other", article)).toBe(false);
    expect(leadPopupPathMatches(article, "/articles/*")).toBe(true);
    expect(leadPopupPathMatches("/articles", "/articles/*")).toBe(false);
    expect(leadPopupPathMatches("/pricing", "/articles/*, /pricing")).toBe(true);
    expect(leadPopupPathMatches("/", "*")).toBe(true);
    expect(leadPopupPathMatches("/anything", "*")).toBe(true);
    expect(leadPopupPathMatches(article, "")).toBe(false);
    expect(leadPopupPathMatches(article, "/blog/*")).toBe(false);
  });

  it("allows only the marketing site and Framer preview origins", () => {
    expect(leadPopupAllowedOrigin("https://www.sopmojo.com")).toBe("https://www.sopmojo.com");
    expect(leadPopupAllowedOrigin("https://sopmojo.com")).toBe("https://sopmojo.com");
    expect(leadPopupAllowedOrigin("https://preview-123.framer.app")).toBe("https://preview-123.framer.app");
    expect(leadPopupAllowedOrigin("https://preview-123.framer.website")).toBe("https://preview-123.framer.website");
    expect(leadPopupAllowedOrigin("https://framer.app")).toBe("https://framer.app");
    expect(leadPopupAllowedOrigin("https://framer.website")).toBe("https://framer.website");
    expect(leadPopupAllowedOrigin("http://www.sopmojo.com")).toBeNull();
    expect(leadPopupAllowedOrigin("https://evil.com")).toBeNull();
    expect(leadPopupAllowedOrigin("https://www.sopmojo.com.evil.com")).toBeNull();
    expect(leadPopupAllowedOrigin("https://notframer.app.evil.com")).toBeNull();
    expect(leadPopupAllowedOrigin("https://evil.framer.app.attacker.com")).toBeNull();
    expect(leadPopupAllowedOrigin("https://sopmojo.com/path")).toBeNull();
  });

  it("allows this app and the current Vercel deployment", async () => {
    const empty = {} as unknown as NodeJS.ProcessEnv;
    expect(leadPopupAllowedOrigin("https://pay.sopmojo.com", empty)).toBe("https://pay.sopmojo.com");
    expect(leadPopupAllowedOrigin("http://pay.sopmojo.com", empty)).toBeNull();
    expect(leadPopupAllowedOrigin("https://pay.sopmojo.com.evil.com", empty)).toBeNull();
    expect(leadPopupAllowedOrigin("https://pay.sopmojo.com/path", empty)).toBeNull();

    const custom = { PAY_ORIGIN: "https://checkout.example.com/" } as unknown as NodeJS.ProcessEnv;
    expect(leadPopupAllowedOrigin("https://checkout.example.com", custom)).toBe("https://checkout.example.com");
    expect(leadPopupAllowedOrigin("https://pay.sopmojo.com", custom)).toBe("https://pay.sopmojo.com");
    expect(leadPopupAllowedOrigin("http://checkout.example.com", custom)).toBeNull();
    expect(leadPopupAllowedOrigin("https://checkout.example.com.evil.com", custom)).toBeNull();

    const preview = { VERCEL_URL: "sop-mojo-git-preview.vercel.app" } as unknown as NodeJS.ProcessEnv;
    expect(leadPopupAllowedOrigin("https://sop-mojo-git-preview.vercel.app", preview)).toBe(
      "https://sop-mojo-git-preview.vercel.app",
    );
    expect(leadPopupAllowedOrigin("https://other.vercel.app", preview)).toBeNull();
    expect(leadPopupAllowedOrigin("https://sop-mojo-git-preview.vercel.app.evil.com", preview)).toBeNull();

    const same = await OPTIONS(
      new Request("https://pay.sopmojo.com/api/lead/qc-pack", {
        method: "OPTIONS",
        headers: { Origin: "https://pay.sopmojo.com" },
      }),
    );
    expect(same.status).toBe(204);
    expect(same.headers.get("access-control-allow-origin")).toBe("https://pay.sopmojo.com");
  });

  it("sets CORS only for an allowed origin and keeps the pack link out of the response", async () => {
    const allowed = await OPTIONS(new Request("https://pay.sopmojo.com/api/lead/qc-pack", { method: "OPTIONS", headers: { Origin: "https://www.sopmojo.com" } }));
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://www.sopmojo.com");
    expect(allowed.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(allowed.headers.get("access-control-allow-headers")).toBe("Content-Type");

    const framer = await OPTIONS(new Request("https://pay.sopmojo.com/api/lead/qc-pack", { method: "OPTIONS", headers: { Origin: "https://ryan.framer.website" } }));
    expect(framer.status).toBe(204);
    expect(framer.headers.get("access-control-allow-origin")).toBe("https://ryan.framer.website");

    const blocked = await OPTIONS(new Request("https://pay.sopmojo.com/api/lead/qc-pack", { method: "OPTIONS", headers: { Origin: "https://evil.com" } }));
    expect(blocked.status).toBe(403);
    expect(blocked.headers.get("access-control-allow-origin")).toBeNull();

    const rejected = await POST(new Request("https://pay.sopmojo.com/api/lead/qc-pack", {
      method: "POST",
      headers: { Origin: "https://evil.com", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A", email: "a@example.com", company: "" }),
    }));
    expect(rejected.status).toBe(403);

    const honeypot = await POST(new Request("https://pay.sopmojo.com/api/lead/qc-pack", {
      method: "POST",
      headers: { Origin: "https://sopmojo.com", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A", email: "a@example.com", company: "Bot" }),
    }));
    expect(honeypot.status).toBe(200);
    expect(honeypot.headers.get("access-control-allow-origin")).toBe("https://sopmojo.com");
    const payload = await honeypot.json();
    expect(payload).toEqual({ ok: true });
    expect(JSON.stringify(payload)).not.toContain("http");
  });

  it("serves a namespaced script and a noindex demo", async () => {
    new Function(leadPopupScript());
    const script = leadPopupScript();
    expect(script).toContain(leadPopupPathMatches.toString());
    expect(script).toContain("Send me the pack");
    expect(script).toContain("Or take the 2-minute QMS check");
    expect(script).toContain("Check your inbox");
    expect(script).toContain("https://pay.sopmojo.com/api/lead/qc-pack");
    expect(script).toContain("https://pay.sopmojo.com/quality-management-software-fit-check");
    expect(script).toContain("sop-lead-root");
    expect(script).toContain("max-height:35vh");
    expect(script).toContain("aria-label");
    expect(script).toContain("Escape");
    expect(script).toContain("force=1");
    expect(script).toContain(">= 0.5");
    expect(script).toContain("365");
    expect(script).not.toContain("docs.google");
    expect(LEAD_POPUP_SNIPPET).toBe(
      '<script src="https://pay.sopmojo.com/embed/lead-popup.js" data-offer="qc-pack" data-paths="/articles/quality-management-software" defer></script>',
    );

    const response = popupScript();
    expect(response.headers.get("content-type")).toContain("javascript");
    expect(await response.text()).toContain("sop-lead-root");

    const demo = readFileSync(path.join(process.cwd(), "app/embed/demo/page.tsx"), "utf8");
    expect(demo).toContain('data-paths="*"');
    expect(demo).toContain("privateMetadata");
    expect(isNoIndexPath("/embed/demo")).toBe(true);
    expect(hidesAccountHeaderLink("/embed/demo")).toBe(true);
    const ready = proxy(new NextRequest("https://pay.sopmojo.com/embed/demo?force=1"));
    expect(ready.headers.get("x-robots-tag")).toBe(NOINDEX_HEADER);
  });
});
