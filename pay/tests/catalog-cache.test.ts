import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCatalogReadCache, createCatalogStore } from "@/lib/catalog-store";
import { seedProducts } from "@/lib/seed";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service",
} as unknown as NodeJS.ProcessEnv;

const rows = [
  { id: "builder_pro", payload: seedProducts()[1] },
  { id: "__settings", payload: { stripeMode: "test", taxNotice: null } },
];

function jsonResponse() {
  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  clearCatalogReadCache();
  vi.unstubAllGlobals();
});

describe("catalog read cache", () => {
  it("reuses one Supabase read for a short time and does not change prices", async () => {
    let calls = 0;
    let open = false;
    const waiters: Array<() => void> = [];
    vi.stubGlobal("fetch", () => {
      calls += 1;
      return new Promise<Response>((resolve) => {
        const finish = () => resolve(jsonResponse());
        if (open) finish();
        else waiters.push(finish);
      });
    });
    const store = createCatalogStore(env);
    const first = store.read();
    const second = store.read();
    expect(calls).toBe(1);
    open = true;
    waiters.splice(0).forEach((finish) => finish());
    const [a, b] = await Promise.all([first, second]);
    expect(a.products.find((product) => product.id === "builder_pro")?.priceCents).toBe(3900);
    expect(b.products.find((product) => product.id === "builder_pro")?.annual?.priceCents).toBe(39000);
    expect(await store.read()).toBe(a);
    expect(calls).toBe(1);
    clearCatalogReadCache();
    await store.read();
    expect(calls).toBe(2);
  });
});
