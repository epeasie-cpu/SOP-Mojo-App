import { describe, expect, it } from "vitest";
import { memoryEventStore } from "@/lib/event-store";
import { grantAccess } from "@/lib/fulfillment";
import { processStripeEvent } from "@/lib/process-event";
import { decideAction, type IncomingStripeEvent } from "@/lib/stripe-events";

const SECRET_ENV = {
  ENTITLEMENT_WEBHOOK_SECRET: "secret",
  ENTITLEMENTS_WEBHOOK_URL: "https://flowchart.sopmojo.com/api/webhooks/entitlements",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  MAKE_CREDENTIALS_WEBHOOK_URL: "https://hook.make.test/credentials",
} as unknown as NodeJS.ProcessEnv;

function paid(id: string, product = "flowchart_plus"): IncomingStripeEvent {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        payment_status: "paid",
        customer_details: { email: "buyer@example.com" },
        metadata: { entitlements: product, email: "buyer@example.com" },
      },
    },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("idempotent stripe webhook", () => {
  it("ignores a second delivery of the same event id", async () => {
    const store = memoryEventStore();
    let entitlementPosts = 0;
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/api/webhooks/entitlements")) {
        entitlementPosts += 1;
        return json({ ok: true, created_user: false });
      }
      return json({});
    };
    const env = { ENTITLEMENT_WEBHOOK_SECRET: "secret" } as unknown as NodeJS.ProcessEnv;
    const event = paid("evt_same");
    const first = await processStripeEvent(event, { env, fetchImpl, store });
    const second = await processStripeEvent(event, { env, fetchImpl, store });
    expect(first.duplicate).toBe(false);
    expect(second).toEqual({ duplicate: true, action: "ignore" });
    expect(entitlementPosts).toBe(1);
  });

  it("does not mark the event when fulfillment fails, so Stripe can retry", async () => {
    const store = memoryEventStore();
    let calls = 0;
    const fetchImpl: typeof fetch = async (input) => {
      calls += 1;
      if (String(input).includes("entitlements")) return json({ error: "no" }, 500);
      return json({});
    };
    const env = { ENTITLEMENT_WEBHOOK_SECRET: "secret" } as unknown as NodeJS.ProcessEnv;
    await expect(processStripeEvent(paid("evt_retry"), { env, fetchImpl, store })).rejects.toThrow(/500/);
    expect(await store.has("evt_retry")).toBe(false);
    expect(calls).toBe(1);
  });

  it("creates one Supabase user and sends one credential email across retries and a second purchase", async () => {
    const store = memoryEventStore();
    let userId: string | null = null;
    let metadata: Record<string, unknown> = {};
    let creates = 0;
    let makeCalls = 0;
    const passwords: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/rpc/entitlement_user_id_by_email")) return json(userId);
      if (url.includes("/auth/v1/admin/users") && method === "POST") {
        creates += 1;
        userId = "user-new";
        metadata = { pay_credentials: "pending" };
        return json({ id: userId });
      }
      if (url.includes("/auth/v1/admin/users/") && method === "GET") {
        return json({ id: userId, app_metadata: metadata });
      }
      if (url.includes("/auth/v1/admin/users/") && method === "PUT") {
        const body = JSON.parse(String(init?.body)) as { app_metadata?: Record<string, unknown> };
        if (body.app_metadata) metadata = body.app_metadata;
        return json({ id: userId });
      }
      if (url.includes("/api/webhooks/entitlements")) return json({ ok: true, created_user: false });
      if (url.includes("hook.make.test")) {
        makeCalls += 1;
        const body = JSON.parse(String(init?.body)) as { do_not_create_user?: boolean; password?: string };
        expect(body.do_not_create_user).toBe(true);
        passwords.push(body.password ?? "");
        return json({ ok: true });
      }
      return json({});
    };

    await processStripeEvent(paid("evt_first"), { env: SECRET_ENV, fetchImpl, store });
    await processStripeEvent(paid("evt_first"), { env: SECRET_ENV, fetchImpl, store });
    await processStripeEvent(paid("evt_builder", "builder_pro"), { env: SECRET_ENV, fetchImpl, store });

    expect(creates).toBe(1);
    expect(makeCalls).toBe(1);
    expect(passwords).toHaveLength(1);
    expect(passwords[0]?.length).toBeGreaterThan(8);
  });

  it("does not email or rotate a password for someone who already has an account", async () => {
    let makeCalls = 0;
    let creates = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/rpc/entitlement_user_id_by_email")) return json("user-old");
      if (url.includes("/auth/v1/admin/users") && method === "POST") {
        creates += 1;
        return json({ id: "user-old" });
      }
      if (url.includes("/auth/v1/admin/users/") && method === "GET") {
        return json({ id: "user-old", app_metadata: {} });
      }
      if (url.includes("hook.make.test")) {
        makeCalls += 1;
        return json({ ok: true });
      }
      if (url.includes("entitlements")) return json({ ok: true, created_user: false });
      return json({});
    };
    const result = await grantAccess({
      email: "buyer@example.com",
      products: ["flowchart_plus"],
      eventId: "evt_existing",
      allowCredentials: true,
      env: SECRET_ENV,
      fetchImpl,
      store: memoryEventStore(),
    });
    expect(creates).toBe(0);
    expect(makeCalls).toBe(0);
    expect(result.credentials).toBe("skipped_existing");
  });

  it("revokes on refund and renewal does not send credentials", () => {
    const refund = decideAction({
      id: "evt_refund",
      type: "charge.refunded",
      data: {
        object: {
          amount_refunded: 1900,
          metadata: { entitlements: "flowchart_plus", email: "buyer@example.com" },
        },
      },
    });
    expect(refund).toEqual({ kind: "revoke", email: "buyer@example.com", products: ["flowchart_plus"] });

    const renewal = decideAction({
      id: "evt_renew",
      type: "invoice.paid",
      data: {
        object: {
          billing_reason: "subscription_cycle",
          customer_email: "buyer@example.com",
          parent: { subscription_details: { metadata: { entitlements: "builder_pro", email: "buyer@example.com" } } },
        },
      },
    });
    expect(renewal).toEqual({
      kind: "grant",
      email: "buyer@example.com",
      products: ["builder_pro"],
      allowCredentials: false,
    });

    const decline = decideAction({
      id: "evt_decline",
      type: "payment_intent.payment_failed",
      data: { object: { metadata: { email: "buyer@example.com", entitlements: "flowchart_plus" } } },
    });
    expect(decline.kind).toBe("decline");

    const cancel = decideAction({
      id: "evt_cancel",
      type: "customer.subscription.deleted",
      data: { object: { metadata: { entitlements: "builder_pro", email: "buyer@example.com" } } },
    });
    expect(cancel.kind).toBe("revoke");
  });

  it("revokes only the refunded product once when the same event is delivered twice", async () => {
    const store = memoryEventStore();
    const posts: { product: string; active: boolean }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/api/webhooks/entitlements")) {
        const body = JSON.parse(String(init?.body)) as { product: string; active: boolean };
        posts.push(body);
        return json({ ok: true });
      }
      return json({});
    };
    const event: IncomingStripeEvent = {
      id: "evt_refund_once",
      type: "charge.refunded",
      data: {
        object: {
          amount_refunded: 1900,
          metadata: { entitlements: "flowchart_plus", email: "buyer@example.com" },
        },
      },
    };
    const env = { ENTITLEMENT_WEBHOOK_SECRET: "secret" } as unknown as NodeJS.ProcessEnv;
    const first = await processStripeEvent(event, { env, fetchImpl, store });
    const second = await processStripeEvent(event, { env, fetchImpl, store });
    expect(first).toEqual({ duplicate: false, action: "revoke" });
    expect(second).toEqual({ duplicate: true, action: "ignore" });
    expect(posts).toEqual([{ email: "buyer@example.com", product: "flowchart_plus", active: false }]);
  });
});
