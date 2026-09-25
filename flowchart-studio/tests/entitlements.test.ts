import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getEntitlements } from "@/app/api/entitlements/route";
import { POST as handoffPost } from "@/app/api/handoff/route";
import { POST as attachPost } from "@/app/api/studio/attach/route";
import { POST as webhookPost } from "@/app/api/webhooks/entitlements/route";
import { grantEntitlement, resolveRequestEntitlements } from "@/lib/entitlement-admin";
import { noteQaUnlock } from "@/lib/entitlement-state";
import {
  parseEntitlementWebhook,
  productFromToken,
} from "@/lib/entitlement-webhook";
import {
  ENTITLEMENT_CONTRACT,
  LOCKED_ENTITLEMENTS,
  UNLOCK_STORAGE_KEY,
  allowsPremium,
  canExportToBuilder,
  canPrintExport,
  clearLegacyUnlockStorage,
  qaUnlockFromQuery,
  resolveEntitlements,
} from "@/lib/entitlements";
import { proxyStudio } from "@/lib/studio-gate";
import { listGatedBuilderSops } from "@/lib/studio-client";
import { demoGraph } from "@/lib/template-graph";
import { presentedWebhookSecret, secretsMatch } from "@/lib/webhook-secret";

const ENV_KEYS = [
  "ENTITLEMENT_WEBHOOK_SECRET",
  "MAKE_WEBHOOK_SECRET",
  "FLOWCHART_QA_UNLOCK",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function readStudio(rel: string) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

async function withEnv(
  patch: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>,
  run: () => Promise<void>,
) {
  const saved = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    for (const key of ENV_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      const value = patch[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await run();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  noteQaUnlock(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("entitlement matrix", () => {
  it("locks print, export, and export-to-builder when both flags are false", () => {
    expect(canPrintExport(LOCKED_ENTITLEMENTS)).toBe(false);
    expect(canExportToBuilder(LOCKED_ENTITLEMENTS)).toBe(false);
    expect(allowsPremium(LOCKED_ENTITLEMENTS, "print")).toBe(false);
    expect(allowsPremium(LOCKED_ENTITLEMENTS, "export")).toBe(false);
    expect(allowsPremium(LOCKED_ENTITLEMENTS, "send")).toBe(false);
  });

  it("lets flowchart_plus print and export, and blocks export-to-builder", () => {
    const plus = { flowchart_plus: true, builder_pro: false };
    expect(canPrintExport(plus)).toBe(true);
    expect(allowsPremium(plus, "print")).toBe(true);
    expect(allowsPremium(plus, "export")).toBe(true);
    expect(canExportToBuilder(plus)).toBe(false);
    expect(allowsPremium(plus, "send")).toBe(false);
  });

  it("lets builder_pro print, export, and export-to-builder without flowchart_plus", () => {
    const pro = { flowchart_plus: false, builder_pro: true };
    expect(canPrintExport(pro)).toBe(true);
    expect(canExportToBuilder(pro)).toBe(true);
    expect(allowsPremium(pro, "print")).toBe(true);
    expect(allowsPremium(pro, "export")).toBe(true);
    expect(allowsPremium(pro, "send")).toBe(true);
  });

  it("keeps both products allowed when both flags are true", () => {
    const both = { flowchart_plus: true, builder_pro: true };
    expect(allowsPremium(both, "print")).toBe(true);
    expect(allowsPremium(both, "export")).toBe(true);
    expect(allowsPremium(both, "send")).toBe(true);
  });

  it("ignores ?unlock= unless the server QA flag is on", () => {
    const locked = resolveEntitlements(LOCKED_ENTITLEMENTS, "builder-pro", false);
    expect(locked).toMatchObject({ flowchart_plus: false, builder_pro: false, source: "none" });
    expect(canExportToBuilder(locked)).toBe(false);

    const plus = resolveEntitlements(LOCKED_ENTITLEMENTS, "1", true);
    expect(plus).toMatchObject({ flowchart_plus: true, builder_pro: false, source: "qa" });
    expect(canPrintExport(plus)).toBe(true);
    expect(canExportToBuilder(plus)).toBe(false);

    const pro = resolveEntitlements(LOCKED_ENTITLEMENTS, "builder-pro", true);
    expect(pro.flowchart_plus).toBe(false);
    expect(pro.builder_pro).toBe(true);
    expect(canPrintExport(pro)).toBe(true);
    expect(canExportToBuilder(pro)).toBe(true);
    expect(qaUnlockFromQuery("flowchart-plus")).toEqual({
      flowchart_plus: true,
      builder_pro: false,
    });
  });

  it("documents the shared table and column names", () => {
    expect(ENTITLEMENT_CONTRACT).toMatchObject({
      schema: "public",
      table: "entitlements",
      columns: {
        flowchartPlus: "flowchart_plus",
        builderPro: "builder_pro",
      },
      printExport: "flowchart_plus OR builder_pro",
      exportToBuilder: "builder_pro",
    });
    const sql = readStudio("supabase/migrations/20260925_entitlements.sql");
    expect(sql).toContain("flowchart_plus boolean not null default false");
    expect(sql).toContain("builder_pro boolean not null default false");
    expect(sql).toContain("user_id = auth.uid()");
    expect(sql).toContain("entitlement_user_id_by_email");
    const doc = readStudio("ENTITLEMENTS.md");
    expect(doc).toContain("public.entitlements");
    expect(doc).toContain("FLOWCHART_QA_UNLOCK");
    expect(doc).toContain("?unlock=1");
    expect(doc).toContain("?unlock=builder-pro");
    expect(doc).toContain("ENTITLEMENT_WEBHOOK_SECRET");
  });
});

describe("account read", () => {
  it("reads flowchart_plus from the user JWT and does not grant builder_pro", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/auth/v1/user")) return jsonResponse({ id: "user-1", email: "a@b.co" });
      if (url.includes("/rest/v1/entitlements")) {
        return jsonResponse([{ flowchart_plus: true, builder_pro: false }]);
      }
      throw new Error(`unexpected ${url}`);
    });
    const result = await resolveRequestEntitlements(
      new Request("https://flowchart.sopmojo.com/api/entitlements", {
        headers: { Authorization: "Bearer user-token" },
      }),
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    );
    expect(result.userId).toBe("user-1");
    expect(canPrintExport(result)).toBe(true);
    expect(canExportToBuilder(result)).toBe(false);
    expect(result.source).toBe("account");
    expect(String(fetchImpl.mock.calls[1][0])).toContain("user_id=eq.user-1");
    expect(String(fetchImpl.mock.calls[1][0])).toContain("select=flowchart_plus,builder_pro");
  });
});

describe("QA route", () => {
  it("applies ?unlock= only when FLOWCHART_QA_UNLOCK is on", async () => {
    await withEnv(
      {
        FLOWCHART_QA_UNLOCK: undefined,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      },
      async () => {
        const locked = await getEntitlements(
          new Request("https://flowchart.sopmojo.com/api/entitlements?unlock=builder-pro"),
        );
        expect(await locked.json()).toMatchObject({
          flowchart_plus: false,
          builder_pro: false,
          can_print_export: false,
          can_export_to_builder: false,
          source: "none",
          qa_applied: false,
        });
      },
    );

    await withEnv(
      {
        FLOWCHART_QA_UNLOCK: "1",
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      },
      async () => {
        const plus = await getEntitlements(
          new Request("https://flowchart.sopmojo.com/api/entitlements?unlock=1"),
        );
        expect(await plus.json()).toMatchObject({
          flowchart_plus: true,
          builder_pro: false,
          can_print_export: true,
          can_export_to_builder: false,
          source: "qa",
          qa_applied: true,
        });
        const pro = await getEntitlements(
          new Request("https://flowchart.sopmojo.com/api/entitlements?unlock=builder-pro"),
        );
        expect(await pro.json()).toMatchObject({
          flowchart_plus: false,
          builder_pro: true,
          can_print_export: true,
          can_export_to_builder: true,
          source: "qa",
        });
      },
    );
  });
});

describe("studio proxy", () => {
  const cleared = {
    FLOWCHART_QA_UNLOCK: undefined,
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
  } as const;

  it("blocks flowchart_plus and forwards builder_pro to Builder", async () => {
    await withEnv({ ...cleared, FLOWCHART_QA_UNLOCK: "1" }, async () => {
      const blocked = vi.fn();
      const plus = await proxyStudio(
        new Request("https://flowchart.sopmojo.com/api/studio/sops", {
          headers: { Authorization: "Bearer tok", "x-flowchart-qa-unlock": "flowchart-plus" },
        }),
        "/api/studio/sops",
        blocked,
      );
      expect(plus.status).toBe(403);
      expect(await plus.json()).toMatchObject({ code: "builder_pro_required" });
      expect(blocked).not.toHaveBeenCalled();

      const forwarded = vi.fn(async () => jsonResponse({ sops: [] }));
      const pro = await proxyStudio(
        new Request("https://flowchart.sopmojo.com/api/studio/attach", {
          method: "POST",
          headers: {
            Authorization: "Bearer tok",
            "Content-Type": "application/json",
            "x-flowchart-qa-unlock": "builder-pro",
          },
          body: JSON.stringify({ sopId: "sop_1" }),
        }),
        "/api/studio/attach",
        forwarded,
      );
      expect(pro.status).toBe(200);
      expect(forwarded).toHaveBeenCalledWith(
        "https://builder.sopmojo.com/api/studio/attach",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer tok",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sopId: "sop_1" }),
        }),
      );
    });
  });

  it("does not honor the QA header on the attach route when the env flag is off", async () => {
    await withEnv(cleared, async () => {
      const response = await attachPost(
        new Request("https://flowchart.sopmojo.com/api/studio/attach", {
          method: "POST",
          headers: {
            Authorization: "Bearer tok",
            "Content-Type": "application/json",
            "x-flowchart-qa-unlock": "builder-pro",
          },
          body: JSON.stringify({ sopId: "sop_1" }),
        }),
      );
      expect(response.status).toBe(403);
    });
  });
});

describe("handoff export gate", () => {
  it("rejects file export without an entitlement and allows Flowchart Plus QA", async () => {
    await withEnv(
      {
        FLOWCHART_QA_UNLOCK: undefined,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      },
      async () => {
        const locked = await handoffPost(
          new Request("https://flowchart.sopmojo.com/api/handoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ graph: demoGraph() }),
          }),
        );
        expect(locked.status).toBe(403);
        expect(await locked.json()).toMatchObject({ code: "flowchart_plus_required" });
      },
    );

    await withEnv(
      {
        FLOWCHART_QA_UNLOCK: "1",
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      },
      async () => {
        const allowed = await handoffPost(
          new Request("https://flowchart.sopmojo.com/api/handoff", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-flowchart-qa-unlock": "1",
            },
            body: JSON.stringify({ graph: demoGraph() }),
          }),
        );
        expect(allowed.status).toBe(200);
        const body = (await allowed.json()) as { jsonUrl?: string };
        expect(body.jsonUrl).toContain("/api/handoff/");
      },
    );
  });
});

describe("entitlement webhook", () => {
  it("maps SamCart emails and product slugs, including refunds", () => {
    expect(
      parseEntitlementWebhook({
        customer: { email: "Buyer@Example.com" },
        product: { slug: "flowchart-studio" },
      }),
    ).toEqual({
      ok: true,
      command: { email: "buyer@example.com", product: "flowchart_plus", active: true },
    });
    expect(productFromToken("Builder Pro")).toBe("builder_pro");
    expect(
      parseEntitlementWebhook({
        type: "Refund",
        email: "buyer@example.com",
        product: "builder-pro",
      }),
    ).toEqual({
      ok: true,
      command: { email: "buyer@example.com", product: "builder_pro", active: false },
    });
    expect(parseEntitlementWebhook({ email: "nope" }).ok).toBe(false);
    expect(parseEntitlementWebhook({ email: "a@b.co", product: "writer" }).ok).toBe(false);
  });

  it("rejects a missing or wrong secret before touching Supabase", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await withEnv(
      { ENTITLEMENT_WEBHOOK_SECRET: undefined, MAKE_WEBHOOK_SECRET: undefined },
      async () => {
        const response = await webhookPost(
          new Request("https://flowchart.sopmojo.com/api/webhooks/entitlements", {
            method: "POST",
            body: JSON.stringify({ email: "a@b.co", product: "flowchart_plus" }),
          }),
        );
        expect(response.status).toBe(503);
      },
    );
    await withEnv({ ENTITLEMENT_WEBHOOK_SECRET: "secret", MAKE_WEBHOOK_SECRET: undefined }, async () => {
      const response = await webhookPost(
        new Request("https://flowchart.sopmojo.com/api/webhooks/entitlements", {
          method: "POST",
          headers: { Authorization: "Bearer wrong" },
          body: JSON.stringify({ email: "a@b.co", product: "flowchart_plus" }),
        }),
      );
      expect(response.status).toBe(401);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("matches the secret from the bearer token or Make header", () => {
    expect(secretsMatch("secret", "secret")).toBe(true);
    expect(secretsMatch("secret", "secret2")).toBe(false);
    expect(secretsMatch("secret", "secre")).toBe(false);
    const request = new Request("https://flowchart.sopmojo.com/api/webhooks/entitlements", {
      headers: { "x-make-secret": "from-make" },
    });
    expect(presentedWebhookSecret(request)).toBe("from-make");
  });

  it("creates a missing user and sets only flowchart_plus", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/rpc/entitlement_user_id_by_email")) return jsonResponse(null);
      if (url.endsWith("/auth/v1/admin/users")) return jsonResponse({ id: "user-new" });
      if (url.includes("/rest/v1/entitlements")) {
        return jsonResponse([{ flowchart_plus: true, builder_pro: false }]);
      }
      throw new Error(`unexpected ${url} ${init?.method}`);
    });
    const result = await grantEntitlement(
      { email: "buyer@example.com", product: "flowchart_plus", active: true },
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    );
    expect(result).toMatchObject({
      user_id: "user-new",
      created_user: true,
      product: "flowchart_plus",
      active: true,
      flowchart_plus: true,
      builder_pro: false,
    });
    const created = JSON.parse(String(fetchImpl.mock.calls[1][1]?.body)) as {
      email: string;
      email_confirm: boolean;
      password: string;
    };
    expect(created.email).toBe("buyer@example.com");
    expect(created.email_confirm).toBe(true);
    expect(created.password.length).toBeGreaterThan(16);
    expect(result).not.toHaveProperty("password");
    const upsert = JSON.parse(String(fetchImpl.mock.calls[2][1]?.body));
    expect(upsert).toEqual({
      user_id: "user-new",
      email: "buyer@example.com",
      flowchart_plus: true,
    });
  });

  it("updates builder_pro on an existing user and does not set flowchart_plus", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/rpc/entitlement_user_id_by_email")) return jsonResponse("user-2");
      if (url.includes("/rest/v1/entitlements")) {
        return jsonResponse([{ flowchart_plus: false, builder_pro: true }]);
      }
      throw new Error(`unexpected ${url} ${init?.method ?? ""}`);
    });
    const result = await grantEntitlement(
      { email: "buyer@example.com", product: "builder_pro", active: true },
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
      } as unknown as NodeJS.ProcessEnv,
      fetchImpl,
    );
    expect(result.created_user).toBe(false);
    expect(result.builder_pro).toBe(true);
    expect(result.flowchart_plus).toBe(false);
    expect(fetchImpl.mock.calls.map((call) => String(call[0]))).not.toContain(
      "https://example.supabase.co/auth/v1/admin/users",
    );
    const upsert = JSON.parse(String(fetchImpl.mock.calls[1][1]?.body));
    expect(upsert).toEqual({
      user_id: "user-2",
      email: "buyer@example.com",
      builder_pro: true,
    });
  });
});

describe("honor system is not the gate", () => {
  it("clears the legacy localStorage keys and does not write them from the studio", () => {
    const removed: string[] = [];
    clearLegacyUnlockStorage({
      removeItem: (key) => {
        removed.push(key);
      },
    });
    expect(removed).toEqual([UNLOCK_STORAGE_KEY, "flowchart-studio-unlock-source"]);
    const app = readStudio("components/StudioApp.tsx");
    expect(app).not.toContain("persistUnlock");
    expect(app).not.toContain("flowchart-studio-unlocked");
    expect(app).toContain("refreshEntitlements");
    expect(readStudio("lib/persist.ts")).not.toContain("flowchart-studio-unlocked");
    expect(readStudio("components/SignInModal.tsx")).not.toContain("flowchart_plus");
    expect(readStudio("components/SignInModal.tsx")).toContain(
      "Creating an account does not unlock print or export.",
    );
    expect(readStudio("app/api/webhooks/entitlements/route.ts")).toContain("grantEntitlement");
    for (const file of [
      "components/StudioApp.tsx",
      "components/UnlockModal.tsx",
      "lib/entitlements.ts",
      "lib/entitlement-state.ts",
      "lib/studio-client.ts",
    ]) {
      expect(readStudio(file), file).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });

  it("sends export-to-builder through the Studio gate and forwards the QA header only to Studio", async () => {
    noteQaUnlock("builder-pro");
    const fetchImpl = vi.fn(async () => jsonResponse({ sops: [{ id: "s", title: "Pack" }] }));
    const sops = await listGatedBuilderSops("tok", fetchImpl);
    expect(sops[0].title).toBe("Pack");
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/studio/sops",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer tok",
          "x-flowchart-qa-unlock": "builder-pro",
        }),
      }),
    );
    expect(readStudio("components/ExportWizard.tsx")).toContain("listGatedBuilderSops");
    expect(readStudio("components/ExportWizard.tsx")).not.toContain("listBuilderSops");
  });
});
