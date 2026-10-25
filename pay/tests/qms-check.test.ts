import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as robots } from "@/app/robots.txt/route";
import { GET as sitemap } from "@/app/sitemap.xml/route";
import { proxy } from "@/proxy";
import { BUILDER_PRO_GO } from "@/lib/aup-free";
import { credentialSendKey, memoryEventStore } from "@/lib/event-store";
import { QMS_LEAD_TAG, LEAD_MAGNET_TAG } from "@/lib/mailchimp";
import {
  QMS_EMAIL_LEAD,
  QMS_STARTER_PACK_ENV,
  QMS_UPSELL,
  qmsClaimKey,
  qmsPlanEmail,
  qmsStarterPackUrl,
  resetQmsRateLimit,
  submitQmsCheck,
} from "@/lib/qms-check";
import {
  QMS_ARTICLE_URL,
  QMS_BUILDER_PRO_GO,
  QMS_CANONICAL_PATH,
  QMS_FAQ,
  QMS_READY_PATH,
  QMS_SEO_DESCRIPTION,
  QMS_SEO_H1,
  QMS_SEO_TITLE,
  QMS_STARTER_KIT_URL,
  QMS_TOOL_PATH,
  qmsFaqJsonLd,
  qmsLandingMetadata,
} from "@/lib/qms-page";
import {
  QMS_DOC_POINTS,
  QMS_GAP_ORDER,
  QMS_QUESTIONS,
  parseQmsAnswers,
  qmsActionPlan,
  scoreQms,
  type QmsAnswers,
} from "@/lib/qms-score";
import { isNoIndexPath, NOINDEX_HEADER } from "@/lib/robots";
import { DEFAULT_MAILCHIMP_AUDIENCE_ID } from "@/lib/site";
import { seedProducts } from "@/lib/seed";

const blank: QmsAnswers = {
  team: "small",
  regulated: "no",
  field: "no",
  written: "none",
  home: "heads",
  review: "no",
  corrective: "none",
  training: "shadow",
  pain: "founder",
};

function answers(overrides: Partial<QmsAnswers> = {}): QmsAnswers {
  return { ...blank, ...overrides };
}

beforeEach(() => {
  resetQmsRateLimit();
});

describe("Quality System Fit Check", () => {
  it("scores documentation out of 100 and sorts the largest gaps", () => {
    const weights = QMS_GAP_ORDER.map((id) => Math.max(...Object.values(QMS_DOC_POINTS[id])));
    expect(weights).toEqual([25, 20, 20, 20, 15]);
    expect(weights.reduce((sum, points) => sum + points, 0)).toBe(100);
    expect(QMS_QUESTIONS).toHaveLength(9);

    const empty = scoreQms(answers());
    expect(empty.score).toBe(0);
    expect(empty.category).toBe("A");
    expect(empty.nextStep).toBe("builder_pro");
    expect(empty.gaps.map((gap) => gap.id)).toEqual(["written", "home", "review"]);
    expect(empty.gaps.map((gap) => gap.missed)).toEqual([25, 20, 20]);

    const mixed = scoreQms(
      answers({ written: "few", home: "shared", review: "sometimes", corrective: "sheet", training: "written" }),
    );
    expect(mixed.score).toBe(8 + 14 + 10 + 10 + 10);
    expect(mixed.gaps.map((gap) => [gap.id, gap.missed])).toEqual([
      ["written", 17],
      ["review", 10],
      ["corrective", 10],
    ]);

    const full = scoreQms(
      answers({ written: "all", home: "system", review: "yes", corrective: "system", training: "record", pain: "audit", team: "large" }),
    );
    expect(full.score).toBe(100);
    expect(full.gaps).toEqual([]);
    expect(full.category).toBe("A");
    expect(parseQmsAnswers({ ...blank, regulated: "maybe" })).toBeNull();
  });

  it("recommends a compliance QMS for regulated work and a field app otherwise", () => {
    const regulated = scoreQms(answers({ regulated: "yes", field: "yes", written: "all", home: "system", review: "yes", corrective: "system", training: "record" }));
    expect(regulated.category).toBe("C");
    expect(regulated.categoryTitle).toBe("Compliance-grade QMS");
    expect(regulated.nextStep).toBe("compliance_qms");
    expect(regulated.summary).toContain("Documented SOPs are still the foundation.");
    expect(regulated.summary).toContain("does not recommend a vendor");
    expect(regulated.summary).toContain("Field inspections still need a checklist");
    expect(regulated.summary).not.toMatch(/Greenlight|Qualio|Process Street|iAuditor|SafetyCulture|ETQ|ZenQMS|Trainual|SamCart/i);

    const field = scoreQms(answers({ field: "yes" }));
    expect(field.category).toBe("B");
    expect(field.categoryTitle).toBe("Field inspection app");
    expect(field.nextStep).toBe("builder_pro");

    const desk = scoreQms(answers({ team: "large", pain: "audit" }));
    expect(desk.category).toBe("A");
    const plan = qmsActionPlan(answers({ regulated: "yes", pain: "audit" }), regulated);
    expect(plan.map((step) => step.label)).toEqual(["Days 1–7", "Days 8–14", "Days 15–21", "Days 22–30"]);
    expect(plan[2]?.text).toContain("Documented SOPs are still the foundation.");
    expect(plan[0]?.text).toContain("audit prep");
  });

  it("emails the plan once, tags Mailchimp, and hides the starter pack until an https URL is set", async () => {
    expect(QMS_BUILDER_PRO_GO).toBe(BUILDER_PRO_GO);
    expect(seedProducts().find((product) => product.id === "builder_pro")?.priceCents).toBe(3900);
    expect(qmsStarterPackUrl({} as NodeJS.ProcessEnv)).toBeNull();
    expect(qmsStarterPackUrl({ [QMS_STARTER_PACK_ENV]: "http://files.example/pack" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    const pack = "https://files.example/quality-control-starter-pack";
    expect(qmsStarterPackUrl({ [QMS_STARTER_PACK_ENV]: pack } as unknown as NodeJS.ProcessEnv)).toBe(pack);

    const hidden = qmsPlanEmail({ result: scoreQms(answers()), answers: answers(), starterPackUrl: null });
    expect(hidden.text).not.toContain("Quality Control Starter Pack");
    expect(hidden.text).toContain("Result: A. Simple SOP and checklist system");
    expect(hidden.text).toContain("Process documentation score: 0 / 100");
    expect(hidden.text).toContain(QMS_UPSELL);
    expect(hidden.text).toContain(QMS_BUILDER_PRO_GO);
    expect(hidden.html).toContain(`href="${QMS_BUILDER_PRO_GO}"`);

    const shown = qmsPlanEmail({
      result: scoreQms(answers({ regulated: "yes" })),
      answers: answers({ regulated: "yes" }),
      starterPackUrl: pack,
    });
    expect(shown.text).toContain("Result: C. Compliance-grade QMS");
    expect(shown.text).toContain("Documented SOPs are still the foundation.");
    expect(shown.text).toContain(pack);
    expect(shown.html).toContain(`href="${pack}"`);
    expect(shown.subject).toBe(QMS_EMAIL_LEAD);

    const mail: { url: string; body: Record<string, unknown> | null }[] = [];
    const resend: { text?: string; html?: string }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      if (url.includes("api.mailchimp.com")) mail.push({ url, body });
      if (url.includes("api.resend.com")) resend.push(body as { text?: string; html?: string });
      if (url.includes("api.mailchimp.com") && url.endsWith("/tags") && mail.length === 2) return new Response("no", { status: 500 });
      return Response.json({ id: "ok" });
    };
    const env = {
      RESEND_API_KEY: "re_test",
      MAILCHIMP_API_KEY: "key-us21",
      MAILCHIMP_AUDIENCE_ID: "other-audience",
      [QMS_STARTER_PACK_ENV]: pack,
    } as unknown as NodeJS.ProcessEnv;
    const store = memoryEventStore();
    const input = {
      email: "Buyer@Example.com",
      name: "Ryan Pease",
      company: "",
      answers: answers({ regulated: "yes" }),
      ip: "203.0.113.20",
      env,
      fetchImpl,
      store,
    };
    expect(await submitQmsCheck(input)).toEqual({ ok: true });
    expect(await submitQmsCheck({ ...input, name: "Again" })).toEqual({ ok: true });
    expect(resend).toHaveLength(1);
    expect(resend[0]?.text).toContain(pack);
    expect(credentialSendKey(qmsClaimKey("Buyer@Example.com"))).toBe("buyer@example.com|qms-check");
    expect(mail.map((call) => call.url).some((url) => url.includes(DEFAULT_MAILCHIMP_AUDIENCE_ID))).toBe(true);
    expect(mail.map((call) => call.url).some((url) => url.includes("other-audience"))).toBe(false);
    const tagged = mail.find((call) => call.url.endsWith("/tags"));
    expect(tagged?.body).toEqual({
      tags: [
        { name: QMS_LEAD_TAG, status: "active" },
        { name: LEAD_MAGNET_TAG, status: "active" },
      ],
    });
    expect(JSON.stringify(tagged?.body)).not.toContain("checkout");
    const member = mail.find((call) => call.url.includes("/members/") && !call.url.endsWith("/tags"));
    expect(member?.body).toMatchObject({ merge_fields: { FNAME: "Ryan Pease" } });

    const honeypot = memoryEventStore();
    let calls = 0;
    expect(
      await submitQmsCheck({
        ...input,
        company: "Acme",
        store: honeypot,
        fetchImpl: async () => {
          calls += 1;
          return Response.json({});
        },
      }),
    ).toEqual({ ok: true });
    expect(calls).toBe(0);
    expect(await honeypot.claimCredentialSend(qmsClaimKey("buyer@example.com"))).toBe(true);

    expect(await submitQmsCheck({ ...input, email: "not-an-email", store: memoryEventStore() })).toEqual({ ok: false, code: "email" });
    expect(await submitQmsCheck({ ...input, name: " ", store: memoryEventStore() })).toEqual({ ok: false, code: "name" });
    expect(await submitQmsCheck({ ...input, answers: { team: "solo" }, store: memoryEventStore() })).toEqual({
      ok: false,
      code: "answers",
    });

    const failing = memoryEventStore();
    expect(
      await submitQmsCheck({
        ...input,
        email: "retry@example.com",
        store: failing,
        fetchImpl: async (inputUrl) => {
          if (String(inputUrl).includes("api.resend.com")) return new Response("no", { status: 500 });
          return Response.json({});
        },
      }),
    ).toEqual({ ok: false, code: "send" });
    expect(await failing.claimCredentialSend(qmsClaimKey("retry@example.com"))).toBe(true);

    for (let index = 0; index < 5; index += 1) {
      expect(
        await submitQmsCheck({
          ...input,
          email: `rate${index}@example.com`,
          ip: "203.0.113.21",
          store: memoryEventStore(),
          fetchImpl: async () => Response.json({}),
        }),
      ).toEqual({ ok: true });
    }
    expect(
      await submitQmsCheck({
        ...input,
        email: "rate-blocked@example.com",
        ip: "203.0.113.21",
        store: memoryEventStore(),
        fetchImpl: async () => {
          throw new Error("rate limit must stop before Mailchimp");
        },
      }),
    ).toEqual({ ok: false, code: "rate" });
  });

  it("publishes the canonical page, keeps checkout noindex, and does not invent proof", async () => {
    expect(QMS_SEO_TITLE).toBe("Do You Need a QMS? 2-Minute Quality System Fit Check | SOP Mojo");
    expect(QMS_SEO_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(QMS_SEO_H1).toBe("Do you need a QMS?");
    const meta = qmsLandingMetadata();
    expect(meta.alternates).toEqual({ canonical: `https://pay.sopmojo.com${QMS_CANONICAL_PATH}` });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.description).toBe(QMS_SEO_DESCRIPTION);
    const faq = qmsFaqJsonLd();
    expect(faq["@type"]).toBe("FAQPage");
    expect(QMS_FAQ).toHaveLength(6);
    expect((faq.mainEntity as unknown[]).length).toBe(6);

    const listed = await (await sitemap()).text();
    expect(listed).toContain(`https://pay.sopmojo.com${QMS_CANONICAL_PATH}`);
    expect(listed).not.toContain(QMS_READY_PATH);
    expect(listed).not.toContain("/checkout");
    const robotsBody = await (await robots()).text();
    expect(robotsBody).toContain(`Allow: ${QMS_CANONICAL_PATH}`);
    expect(robotsBody).toContain(`Allow: ${QMS_TOOL_PATH}`);
    expect(robotsBody).toContain("Disallow: /checkout");
    expect(robotsBody).toContain("Disallow: /admin");
    expect(isNoIndexPath(QMS_CANONICAL_PATH)).toBe(false);
    expect(isNoIndexPath(QMS_TOOL_PATH)).toBe(false);
    expect(isNoIndexPath(QMS_READY_PATH)).toBe(true);
    expect(isNoIndexPath("/checkout/builder_pro")).toBe(true);
    expect(isNoIndexPath("/admin")).toBe(true);
    const ready = proxy(new NextRequest(`https://pay.sopmojo.com${QMS_READY_PATH}`));
    expect(ready.headers.get("x-robots-tag")).toBe(NOINDEX_HEADER);

    const landing = readFileSync(path.join(process.cwd(), "components/QmsLanding.tsx"), "utf8");
    const tool = readFileSync(path.join(process.cwd(), "components/QmsTool.tsx"), "utf8");
    const frame = readFileSync(path.join(process.cwd(), "components/QmsFrame.tsx"), "utf8");
    const canonical = readFileSync(path.join(process.cwd(), "app/quality-management-software-fit-check/page.tsx"), "utf8");
    const free = readFileSync(path.join(process.cwd(), "app/free/qms-check/page.tsx"), "utf8");
    const check = readFileSync(path.join(process.cwd(), "lib/qms-check.ts"), "utf8");
    expect(canonical).toContain("qmsLandingMetadata");
    expect(free).toContain("<QmsLanding");
    expect(landing).toContain("href={QMS_STARTER_KIT_URL}");
    expect(landing).toContain("href={QMS_ARTICLE_URL}");
    expect(QMS_ARTICLE_URL).toBe("https://www.sopmojo.com/articles/quality-management-software");
    expect(landing).toContain("qmsFaqJsonLd");
    expect(landing).not.toMatch(/testimonial|case study|SamCart|Greenlight|Qualio/i);
    expect(tool).toContain('name="email"');
    expect(tool).toContain('name="name"');
    expect(tool).toContain('name="company"');
    expect(tool).toContain('result.nextStep === "builder_pro"');
    expect(frame).toContain("Space_Grotesk");
    expect(frame).toContain("Open_Sans");
    expect(frame).toContain("#0C0E0C");
    expect(tool).toContain("#C1FF72");
    expect(check).not.toContain("AUP_MAKE_WEBHOOK_URL");
    expect(check).not.toContain("hook.us");
    expect(QMS_STARTER_KIT_URL).toBe("https://www.sopmojo.com/lp/sop-starter-kit");
  });
});
