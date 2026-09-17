import { describe, expect, it } from "vitest";
import { GET as llms } from "@/app/llms.txt/route";
import {
  SITE,
  WRITER_TO_BUILDER_UTM,
  WRITER_UPGRADE_URL,
  absoluteUrl,
  hostLabel,
} from "@/lib/site";
import { buildRefinePrompt } from "@/lib/refine-prompt";
import { generateTemplateSop } from "@/lib/template-engine";

describe("canonical and upgrade URLs", () => {
  it("keeps writer.sopmojo.com as the canonical host", () => {
    expect(SITE.host).toBe("https://writer.sopmojo.com");
    expect(hostLabel()).toBe("writer.sopmojo.com");
    expect(absoluteUrl("/")).toBe("https://writer.sopmojo.com");
    expect(absoluteUrl("/faq")).toBe("https://writer.sopmojo.com/faq");
  });

  it("builds the Writer → Builder Pro LP URL with default UTMs", () => {
    expect(SITE.upgradeLp).toBe("https://www.sopmojo.com/lp/ai-sop-writer");
    expect(WRITER_TO_BUILDER_UTM).toEqual({
      utm_source: "ai-sop-writer",
      utm_medium: "product",
      utm_campaign: "writer_to_builder",
    });
    expect(WRITER_UPGRADE_URL).toBe(
      "https://www.sopmojo.com/lp/ai-sop-writer?utm_source=ai-sop-writer&utm_medium=product&utm_campaign=writer_to_builder",
    );
  });

  it("keeps builder.sopmojo.com as the living-system host", () => {
    expect(SITE.builder).toBe("https://builder.sopmojo.com");
    expect(hostLabel(SITE.builder)).toBe("builder.sopmojo.com");
  });

  it("does not use the alpha Vercel host or SamCart as product URLs", () => {
    const urls = [SITE.host, SITE.parent, SITE.builder, SITE.library, SITE.upgradeLp, WRITER_UPGRADE_URL];
    for (const url of urls) {
      expect(url).not.toContain("ai-sop-writer-alpha.vercel.app");
      expect(url).not.toContain("mysamcart.com");
      expect(url).not.toContain("get-started");
    }
  });
});

describe("llms.txt upgrade path", () => {
  it("lists the LP as the upgrade target and builder as the living system", async () => {
    const body = await (await llms()).text();
    expect(body).toContain(SITE.host);
    expect(body).toContain(WRITER_UPGRADE_URL);
    expect(body).toContain(SITE.builder);
    expect(body).not.toContain("ai-sop-writer-alpha.vercel.app");
  });
});

describe("Copy AI prompt canonical host", () => {
  it("mentions writer.sopmojo.com and does not swap in the LP", () => {
    const sop = generateTemplateSop({
      businessType: "Hotel",
      processName: "Guest room turnover",
      role: "Housekeeping supervisor",
    });
    const prompt = buildRefinePrompt(sop);
    expect(prompt).toContain(SITE.host);
    expect(prompt).toContain("https://writer.sopmojo.com");
    expect(prompt).not.toContain(SITE.upgradeLp);
    expect(prompt).not.toContain("utm_campaign=writer_to_builder");
  });
});
