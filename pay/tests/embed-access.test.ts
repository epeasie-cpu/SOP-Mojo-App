import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "@/app/api/products/[slug]/route";
import { EMBED_FRAME_ANCESTORS, embedFramePolicy } from "@/lib/embed-frame";
import { proxy } from "@/proxy";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "Content-Type",
};

function expectProductCors(response: Response) {
  for (const [name, value] of Object.entries(CORS)) {
    expect(response.headers.get(name)).toBe(value);
  }
  expect(response.headers.get("access-control-allow-credentials")).toBeNull();
}

describe("framer embed access", () => {
  it("allows a public product read from any origin, including errors", async () => {
    const found = await GET(new Request("https://pay.sopmojo.com/api/products/builder_pro"), {
      params: Promise.resolve({ slug: "builder_pro" }),
    });
    expect(found.status).toBe(200);
    expectProductCors(found);
    const body = (await found.json()) as { id: string; presentation: string };
    expect(body.id).toBe("builder_pro");
    expect(body.presentation).toBe("panel");

    const missing = await GET(new Request("https://pay.sopmojo.com/api/products/missing"), {
      params: Promise.resolve({ slug: "missing" }),
    });
    expect(missing.status).toBe(404);
    expectProductCors(missing);

    const preflight = OPTIONS();
    expect(preflight.status).toBe(204);
    expectProductCors(preflight);
    expect(await preflight.text()).toBe("");
  });

  it("lets the embed checkout be framed by sopmojo and framer, and skips X-Frame-Options", () => {
    const embed = proxy(new NextRequest("https://pay.sopmojo.com/checkout/builder_pro?embed=1"));
    expect(embed.headers.get("content-security-policy")).toBe(embedFramePolicy());
    for (const ancestor of EMBED_FRAME_ANCESTORS) {
      expect(embed.headers.get("content-security-policy")).toContain(ancestor);
    }
    expect(embed.headers.get("x-frame-options")).toBeNull();
    expect(embed.headers.get("content-security-policy")).not.toContain("default-src");
    expect(embed.headers.get("content-security-policy")).not.toContain("script-src");

    const page = proxy(new NextRequest("https://pay.sopmojo.com/checkout/builder_pro"));
    expect(page.headers.get("content-security-policy")).toBeNull();
    expect(page.headers.get("x-frame-options")).toBeNull();
  });

  it("does not set a global frame policy in next config or vercel.json", () => {
    const config = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("embedFramePolicy");
    expect(config).toContain('key: "embed"');
    expect(config).not.toMatch(/X-Frame-Options/i);
    expect(config).not.toMatch(/default-src|script-src|frame-src/);
    expect(existsSync(path.join(process.cwd(), "vercel.json"))).toBe(false);
    const proxySource = readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8");
    expect(proxySource).toContain('headers.delete("X-Frame-Options")');
  });
});
