import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONTENT, getUseCaseEntries } from "@/lib/content";
import { jsonLdGraph } from "@/lib/jsonld";
import { mergePrefill, sanitizePrefillParam } from "@/lib/prefill";
import { PERMANENT_REDIRECTS } from "@/lib/redirects";
import { buildMetadata, templateDocumentTitle } from "@/lib/seo";
import { BUILDER_TRY_URL, SITE, STARTER_KIT_URL, WRITER_UPGRADE_URL, builderTryUrl } from "@/lib/site";
import { TEMPLATES, getTemplate, relatedTemplates } from "@/lib/templates";

const FORBIDDEN =
  /samcart|hipaa|e-signature|esignature|docusign|\bosha\b|\bdol\b|inspector-approved|cassidy|kobialka|\brhtc\b|clark bees|boot camp|battalion/i;

function read(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("SOP template registry", () => {
  it("publishes ten readable templates with valid SEO fields", () => {
    expect(TEMPLATES).toHaveLength(10);
    const slugs = new Set<string>();
    const tags = new Set<string>();
    for (const entry of TEMPLATES) {
      expect(entry.type).toBe("template");
      expect(entry.slug).toBeTruthy();
      expect(slugs.has(entry.slug as string)).toBe(false);
      slugs.add(entry.slug as string);
      expect(entry.path).toBe(`/sop-templates/${entry.slug}`);
      if (entry.slug !== "opening-and-closing-procedures") {
        expect(entry.slug?.endsWith("-sop-template")).toBe(true);
      }
      expect(entry.keyword.length).toBeLessThanOrEqual(60);
      expect(entry.heading.length).toBeLessThanOrEqual(60);
      expect(entry.description.length).toBeGreaterThanOrEqual(140);
      expect(entry.description.length).toBeLessThanOrEqual(160);
      expect(entry.faqs?.length ?? 0).toBeGreaterThanOrEqual(4);
      expect(entry.prefill?.processName).toBeTruthy();
      expect(entry.industry).toBeTruthy();
      expect(entry.templateSteps?.length ?? 0).toBeGreaterThanOrEqual(5);
      expect(entry.checklist?.length ?? 0).toBeGreaterThanOrEqual(4);
      expect(entry.exceptions?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(entry.customize?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(entry.customize?.length ?? 0).toBeLessThanOrEqual(5);
      expect(entry.purpose && entry.scope && entry.records && entry.reviewCadence).toBeTruthy();
      expect(entry.mcTag).toMatch(/^tpl-[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(tags.has(entry.mcTag as string)).toBe(false);
      tags.add(entry.mcTag as string);
      const related = relatedTemplates(entry);
      expect(related.length).toBeGreaterThanOrEqual(3);
      expect(related.length).toBeLessThanOrEqual(6);
      expect(related.every((item) => item.slug !== entry.slug)).toBe(true);
      expect(entry.related?.length).toBe(related.length);
      const title = templateDocumentTitle(entry.heading);
      expect(title).toBe(`${entry.heading} (Free) + AI Writer | SOP Mojo`);
      expect(title.length).toBeLessThanOrEqual(62);
      const meta = buildMetadata(entry);
      expect(meta.title).toBe(title);
      expect(meta.alternates?.canonical).toBe(`${SITE.host}${entry.path}`);
      const graph = JSON.stringify(jsonLdGraph(entry));
      expect(graph).toContain("\"@type\":\"FAQPage\"");
      expect(graph).toContain("\"@type\":\"HowTo\"");
      expect(graph).toContain("\"@type\":\"BreadcrumbList\"");
      expect(graph).toContain("\"@type\":\"SoftwareApplication\"");
      expect(graph).toContain("\"price\":\"0\"");
      expect(graph).not.toContain("aggregateRating");
      expect(graph).not.toContain("reviewCount");
      expect(JSON.stringify(entry)).not.toMatch(FORBIDDEN);
    }
  });

  it("keeps the template copy and the rendered page free of banned claims and SamCart", () => {
    const files = [
      "components/TemplatePage.tsx",
      "components/TemplateLeadForm.tsx",
      "components/Generator.tsx",
      "lib/templates.ts",
      "lib/template-lead.ts",
      "lib/site.ts",
      "app/sop-templates/page.tsx",
      "app/sop-templates/[slug]/page.tsx",
    ];
    for (const file of files) {
      expect(read(file)).not.toMatch(FORBIDDEN);
    }
  });

  it("puts a data-template-slug hook on the generate button and reads query prefill", () => {
    const generator = read("components/Generator.tsx");
    expect(generator).toContain("data-template-slug");
    expect(generator).toContain("mergePrefill");
    const merged = mergePrefill(
      { businessType: "Restaurant", processName: "Kitchen opening", role: "Kitchen manager", kpi: "Ready" },
      { process: "  FOH closing  ", business: "", role: "x".repeat(200) },
    );
    expect(merged.fromQuery).toBe(true);
    expect(merged.form.processName).toBe("FOH closing");
    expect(merged.form.businessType).toBe("Restaurant");
    expect(merged.form.role).toHaveLength(120);
    expect(merged.form.kpi).toBe("Ready");
    expect(sanitizePrefillParam("line\ncheck")).toBe("linecheck");
    expect(
      mergePrefill({ processName: "Kitchen opening" }, { process: "   ", business: null, role: "" }).form
        .processName,
    ).toBe("Kitchen opening");
  });

  it("redirects the old employee onboarding use case and drops it from the registry", () => {
    expect(PERMANENT_REDIRECTS).toEqual([
      {
        source: "/use-cases/employee-onboarding",
        destination: "/sop-templates/employee-onboarding-sop-template",
      },
    ]);
    expect(read("next.config.ts")).toContain("PERMANENT_REDIRECTS");
    expect(read("next.config.ts")).toContain("permanent: true");
    expect(getUseCaseEntries().some((entry) => entry.slug === "employee-onboarding")).toBe(false);
    expect(getTemplate("employee-onboarding-sop-template")?.prefill?.processName).toBe(
      "New hire onboarding",
    );
    expect(CONTENT.some((entry) => entry.path === "/use-cases/employee-onboarding")).toBe(false);
  });

  it("describes the hub as a collection of every template", () => {
    const hub = CONTENT.find((entry) => entry.path === "/sop-templates");
    expect(hub?.type).toBe("page");
    const graph = JSON.stringify(jsonLdGraph(hub!));
    expect(graph).toContain("\"@type\":\"CollectionPage\"");
    expect(graph).toContain("\"@type\":\"ItemList\"");
    for (const entry of TEMPLATES) {
      expect(graph).toContain(entry.path);
    }
    expect(graph).toContain("\"name\":\"Home\"");
  });
});

describe("Builder and Starter Kit links", () => {
  it("keeps the trial CTA on one constant and leaves checkout without UTMs", () => {
    expect(BUILDER_TRY_URL).toBe(SITE.builder);
    expect(BUILDER_TRY_URL).not.toContain("/try");
    const href = builderTryUrl("restaurant-sop-template");
    expect(href.startsWith("https://builder.sopmojo.com/?")).toBe(true);
    expect(href).toContain("utm_source=ai-sop-writer");
    expect(href).toContain("utm_medium=product");
    expect(href).toContain("utm_campaign=writer_to_builder");
    expect(href).toContain("utm_content=restaurant-sop-template");
    expect(STARTER_KIT_URL).toBe("https://www.sopmojo.com/lp/sop-starter-kit");
    expect(WRITER_UPGRADE_URL).toBe("https://pay.sopmojo.com/go/builder_pro");
    expect(WRITER_UPGRADE_URL).not.toContain("utm_");
    for (const url of [BUILDER_TRY_URL, STARTER_KIT_URL, WRITER_UPGRADE_URL, href]) {
      expect(url.toLowerCase()).not.toContain("samcart");
    }
  });
});
