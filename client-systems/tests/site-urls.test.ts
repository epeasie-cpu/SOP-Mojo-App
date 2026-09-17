import { describe, expect, it } from "vitest";
import { BUILDER_CTA_URL, SITE, WRITER_CTA_URL, absoluteUrl, hostLabel } from "@/lib/site";

describe("canonical product URLs", () => {
  it("keeps clients.sopmojo.com as the canonical host", () => {
    expect(SITE.host).toBe("https://clients.sopmojo.com");
    expect(hostLabel()).toBe("clients.sopmojo.com");
    expect(absoluteUrl("/")).toBe("https://clients.sopmojo.com");
    expect(absoluteUrl("/faq")).toBe("https://clients.sopmojo.com/faq");
  });

  it("links Writer, Builder Pro, parent, and the SOP Library", () => {
    expect(SITE.writer).toBe("https://writer.sopmojo.com");
    expect(SITE.builder).toBe("https://builder.sopmojo.com");
    expect(SITE.parent).toBe("https://www.sopmojo.com");
    expect(SITE.library).toBe("https://www.sopmojo.com/soplibrary");
    expect(WRITER_CTA_URL).toContain("https://writer.sopmojo.com");
    expect(BUILDER_CTA_URL).toContain("https://www.sopmojo.com/lp/ai-sop-writer");
  });
});
