import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/unsubscribe/route";
import { freeAupEmail } from "@/lib/aup-free";
import {
  MAILING_ADDRESS,
  REPLY_TO_ADDRESS,
  SPAM_FOLDER_LINE,
  fromHeader,
  listUnsubscribeHeaders,
  readUnsubscribeToken,
  signUnsubscribeToken,
} from "@/lib/can-spam";
import { blueprintDownloadEmail, founderTrapDownloadEmail, offersDownloadEmail } from "@/lib/downloads";
import { memoryEventStore } from "@/lib/event-store";
import { deliveryEmailContent, sendResendEmail } from "@/lib/fulfillment";
import { pendingAccessEmail } from "@/lib/make-delivery";
import { qcPackEmail } from "@/lib/qc-pack";
import { qmsPlanEmail } from "@/lib/qms-check";
import { cptKitEmail } from "@/lib/cpt-kit";
import { scoreQms, type QmsAnswers } from "@/lib/qms-score";
import { suppressionKey } from "@/lib/can-spam";
import { performUnsubscribe } from "@/lib/unsubscribe";

const env = { UNSUBSCRIBE_SECRET: "unsubscribe-test-secret", RESEND_API_KEY: "re_test" } as unknown as NodeJS.ProcessEnv;
const to = "buyer@example.com";

const fitAnswers: QmsAnswers = {
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

describe("CAN-SPAM", () => {
  it("puts the exact address and a reason on every template, and unsubscribe only on marketing", () => {
    expect(MAILING_ADDRESS).toBe("SOP Mojo, 1846 E. Innovation Park Dr. Suite 100, Oro Valley, AZ 85755 USA");
    const scored = scoreQms(fitAnswers);
    const marketing = [
      cptKitEmail("https://files.example/kit", "Alex", { to, env }),
      qcPackEmail("https://files.example/pack", { to, env }),
      qmsPlanEmail({ result: scored, answers: fitAnswers, starterPackUrl: null, to, env }),
      freeAupEmail(null, { to, env }),
      founderTrapDownloadEmail({ url: "https://pay.sopmojo.com/download/token", to, env }),
    ];
    const transactional = [
      offersDownloadEmail({ url: "https://pay.sopmojo.com/download/token", to, env }),
      blueprintDownloadEmail({ url: "https://pay.sopmojo.com/download/token", to, env }),
      deliveryEmailContent({ title: "Flowchart Plus", url: "https://files.example/file", label: "Download", to, env }),
      pendingAccessEmail("Flowchart Plus", { to, env }),
    ];
    for (const letter of [...marketing, ...transactional]) {
      expect(letter.text).toContain(SPAM_FOLDER_LINE);
      expect(letter.html).toContain(MAILING_ADDRESS);
      expect(letter.text).toContain(MAILING_ADDRESS);
      expect(letter.text).toContain("at sopmojo.com.");
    }
    for (const letter of marketing) {
      expect(letter.text).toContain("you requested");
      expect(letter.html).toContain(">Unsubscribe</a>");
      expect(letter.html).not.toContain("Oro Valley, AZ 85755 USA.".repeat(2));
    }
    for (const letter of transactional) {
      expect(letter.text).toContain("you purchased");
      expect(letter.html).not.toContain(">Unsubscribe</a>");
    }
    const unsub = listUnsubscribeHeaders(to, env);
    expect(unsub?.["List-Unsubscribe"]).toMatch(/^<https:\/\/[^>]+>$/);
    expect(unsub?.["List-Unsubscribe"]).not.toContain("mailto:");
    expect(unsub?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(fromHeader({ EMAIL_FROM: "SOP Mojo <orders@sopmojo.com>" } as unknown as NodeJS.ProcessEnv)).toBe(
      "Ryan Pease | SOP Mojo <orders@sopmojo.com>",
    );
    expect(fromHeader({} as unknown as NodeJS.ProcessEnv)).toBe("Ryan Pease | SOP Mojo <writer@sopmojo.com>");
    expect(REPLY_TO_ADDRESS).toBe("ryan@sopmojo.com");
  });

  it("signs a token over the email and rejects a tampered one", () => {
    const token = signUnsubscribeToken("Buyer@Example.com", env);
    expect(token).toBeTruthy();
    expect(readUnsubscribeToken(token ?? "", env)).toBe("buyer@example.com");
    expect(readUnsubscribeToken(`${token}x`, env)).toBeNull();
    const [payload, sig] = (token ?? "").split(".");
    expect(readUnsubscribeToken(`${payload?.slice(0, -1)}.${sig}`, env)).toBeNull();
    expect(signUnsubscribeToken("not-an-email", env)).toBeNull();
  });

  it("unsubscribes in Mailchimp and records suppression, including a missing member", async () => {
    const previous = process.env.UNSUBSCRIBE_SECRET;
    process.env.UNSUBSCRIBE_SECRET = "unsubscribe-test-secret";
    const token = signUnsubscribeToken(to, env) ?? "";
    const calls: { url: string; body: Record<string, unknown> | null; method: string }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method ?? "GET",
        body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
      });
      if (url.includes("api.mailchimp.com")) return new Response("missing", { status: 404 });
      return Response.json({ id: "re_1" });
    };
    const store = memoryEventStore();
    const response = await POST(
      new NextRequest(`https://pay.sopmojo.com/api/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.80" },
      }),
    );
    expect(response.status).toBe(200);
    void fetchImpl;
    const direct = await performUnsubscribe({
      token,
      ip: "203.0.113.81",
      env: { ...env, MAILCHIMP_API_KEY: "key-us21" } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
      store,
    });
    expect(direct).toBe("ok");
    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toContain("/lists/7c2226f741/members/");
    expect(calls[0]?.body).toEqual({ status: "unsubscribed" });
    expect(await store.hasCredentialSend(suppressionKey(to))).toBe(true);
    expect(await performUnsubscribe({ token, ip: "203.0.113.82", env, fetchImpl, store })).toBe("ok");

    const bad = await POST(new NextRequest("https://pay.sopmojo.com/api/unsubscribe?token=nope", { method: "POST" }));
    expect(bad.status).toBe(400);
    if (previous === undefined) delete process.env.UNSUBSCRIBE_SECRET;
    else process.env.UNSUBSCRIBE_SECRET = previous;
  });

  it("skips a marketing send after suppression and still sends an explicit request", async () => {
    const store = memoryEventStore();
    await store.claimCredentialSend(suppressionKey(to));
    const seen: Record<string, unknown>[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      seen.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json({ id: "re_sent" });
    };
    const skipped = await sendResendEmail({
      email: to,
      subject: "Hello",
      text: "Hello",
      env,
      fetchImpl,
      marketing: true,
      store,
    });
    expect(skipped).toEqual({ id: "suppressed" });
    expect(seen).toHaveLength(0);
    const sent = await sendResendEmail({
      email: to,
      subject: "Hello",
      text: "Hello",
      env,
      fetchImpl,
      marketing: true,
      explicitRequest: true,
      store,
    });
    expect(sent).toEqual({ id: "re_sent" });
    expect(seen[0]?.reply_to).toBe("ryan@sopmojo.com");
    const sentHeaders = seen[0]?.headers as Record<string, string>;
    expect(sentHeaders["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sentHeaders["List-Unsubscribe"]).toMatch(/^<https:\/\/[^>]+>$/);
    expect(sentHeaders["List-Unsubscribe"]).not.toContain("mailto:");
    await sendResendEmail({
      email: to,
      subject: "Receipt",
      text: "Receipt",
      env,
      fetchImpl,
      marketing: false,
      store,
    });
    expect(seen[1]?.headers).toBeUndefined();
    expect(seen[1]?.from).toBe("Ryan Pease | SOP Mojo <writer@sopmojo.com>");
  });
});
