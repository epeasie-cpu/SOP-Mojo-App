import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_SETTINGS,
  parseCatalog,
  parseProduct,
  parseSettings,
  type CatalogSnapshot,
  type Product,
} from "./catalog";
import { PROTECTED_CATALOG_IDS } from "./library";
import { seedCatalog } from "./seed";
import { readAdminConfig } from "./fulfillment";

export type InsertResult = { inserted: string[]; skipped: string[] };

function assertLibraryInsert(products: Product[]) {
  const protectedIds = new Set<string>(PROTECTED_CATALOG_IDS);
  const blocked = products.filter((product) => protectedIds.has(product.id));
  if (blocked.length > 0) {
    throw new Error("The library seed cannot write builder_pro, flowchart_plus, or __settings.");
  }
}

export type CatalogStore = {
  read(): Promise<CatalogSnapshot>;
  write(next: CatalogSnapshot): Promise<void>;
  /** Insert missing product rows. Existing ids, including protected ones, are left as they are. */
  insertIfAbsent(products: Product[]): Promise<InsertResult>;
};

function adminHeaders(key: string, json = false): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export function memoryCatalogStore(initial: CatalogSnapshot = seedCatalog()): CatalogStore {
  let snapshot = initial;
  return {
    async read() {
      return snapshot;
    },
    async write(next) {
      snapshot = next;
    },
    async insertIfAbsent(products) {
      assertLibraryInsert(products);
      const ids = new Set(snapshot.products.map((product) => product.id));
      const missing = products.filter((product) => !ids.has(product.id));
      snapshot = { ...snapshot, products: [...snapshot.products, ...missing] };
      return {
        inserted: missing.map((product) => product.id),
        skipped: products.filter((product) => ids.has(product.id)).map((product) => product.id),
      };
    },
  };
}

export function fileCatalogStore(filePath: string): CatalogStore {
  return {
    async read() {
      try {
        const raw = await readFile(filePath, "utf8");
        const parsed = parseCatalog(JSON.parse(raw) as unknown);
        if (parsed.products.length === 0) return seedCatalog();
        return parsed;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") return seedCatalog();
        throw error;
      }
    },
    async write(next) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`);
    },
    async insertIfAbsent(products) {
      assertLibraryInsert(products);
      let raw: { products?: unknown[]; settings?: unknown } = {
        products: [],
        settings: { stripeMode: "test", taxNotice: null },
      };
      try {
        raw = JSON.parse(await readFile(filePath, "utf8")) as { products?: unknown[]; settings?: unknown };
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") throw error;
      }
      const list = Array.isArray(raw.products) ? raw.products : [];
      const ids = new Set(
        list
          .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return "";
            const id = (item as { id?: unknown }).id;
            return typeof id === "string" ? id : "";
          })
          .filter(Boolean),
      );
      const missing = products.filter((product) => !ids.has(product.id));
      if (missing.length > 0) {
        raw.products = [...list, ...missing];
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, `${JSON.stringify(raw, null, 2)}\n`);
      }
      return {
        inserted: missing.map((product) => product.id),
        skipped: products.filter((product) => ids.has(product.id)).map((product) => product.id),
      };
    },
  };
}

export function supabaseCatalogStore(input: {
  url: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
}): CatalogStore {
  const fetchImpl = input.fetchImpl ?? fetch;
  const endpoint = `${input.url}/rest/v1/pay_catalog`;
  return {
    async read() {
      const response = await fetchImpl(`${endpoint}?select=id,payload`, {
        headers: adminHeaders(input.serviceRoleKey),
        next: { revalidate: 15 },
      } as RequestInit);
      if (!response.ok) throw new Error(`Catalog read failed (${response.status}).`);
      const rows = (await response.json()) as { id: string; payload: unknown }[];
      if (!Array.isArray(rows) || rows.length === 0) return seedCatalog();
      const settingsRow = rows.find((row) => row.id === "__settings");
      const products: Product[] = [];
      for (const row of rows) {
        if (row.id === "__settings") continue;
        products.push(parseProduct(row.payload));
      }
      return {
        products: products.length ? products : seedCatalog().products,
        settings: settingsRow ? parseSettings(settingsRow.payload) : DEFAULT_SETTINGS,
      };
    },
    async write(next) {
      const body = [
        ...next.products.map((product) => ({ id: product.id, payload: product })),
        { id: "__settings", payload: next.settings },
      ];
      const saved = await fetchImpl(`${endpoint}?on_conflict=id`, {
        method: "POST",
        headers: {
          ...adminHeaders(input.serviceRoleKey, true),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(body),
      });
      if (!saved.ok) throw new Error(`Catalog save failed (${saved.status}).`);
      const keep = body.map((row) => row.id).join(",");
      const removed = await fetchImpl(`${endpoint}?id=not.in.(${keep})`, {
        method: "DELETE",
        headers: adminHeaders(input.serviceRoleKey),
      });
      if (!removed.ok) throw new Error(`Catalog cleanup failed (${removed.status}).`);
    },
    async insertIfAbsent(products) {
      assertLibraryInsert(products);
      const ids = products.map((product) => product.id);
      const listed = await fetchImpl(`${endpoint}?select=id&id=in.(${ids.join(",")})`, {
        headers: adminHeaders(input.serviceRoleKey),
      });
      if (!listed.ok) throw new Error(`Catalog lookup failed (${listed.status}).`);
      const rows = (await listed.json()) as { id?: string }[];
      const present = new Set(
        (Array.isArray(rows) ? rows : [])
          .map((row) => (typeof row.id === "string" ? row.id : ""))
          .filter(Boolean),
      );
      const missing = products.filter((product) => !present.has(product.id));
      if (missing.length > 0) {
        const saved = await fetchImpl(`${endpoint}?on_conflict=id`, {
          method: "POST",
          headers: {
            ...adminHeaders(input.serviceRoleKey, true),
            Prefer: "resolution=ignore-duplicates,return=minimal",
          },
          body: JSON.stringify(missing.map((product) => ({ id: product.id, payload: product }))),
        });
        if (!saved.ok) throw new Error(`Catalog insert failed (${saved.status}).`);
      }
      return {
        inserted: missing.map((product) => product.id),
        skipped: products.filter((product) => present.has(product.id)).map((product) => product.id),
      };
    },
  };
}

export function catalogFilePath(): string {
  return path.join(process.cwd(), "data", "catalog.json");
}

/** Short read cache so embed prefetch and checkout do not each wait on Supabase. */
export const CATALOG_READ_TTL_MS = 15_000;

type CatalogCacheEntry = { at: number; value: CatalogSnapshot };

const catalogCache = new Map<string, CatalogCacheEntry>();
const catalogInflight = new Map<string, Promise<CatalogSnapshot>>();

export function clearCatalogReadCache(): void {
  catalogCache.clear();
  catalogInflight.clear();
}

function catalogCacheKey(env: NodeJS.ProcessEnv): string {
  const admin = readAdminConfig(env);
  return admin ? `remote:${admin.url}` : "file";
}

export function createCatalogStore(env: NodeJS.ProcessEnv = process.env): CatalogStore {
  const admin = readAdminConfig(env);
  const file = fileCatalogStore(catalogFilePath());
  const remote = admin ? supabaseCatalogStore(admin) : null;
  const key = catalogCacheKey(env);
  async function load(): Promise<CatalogSnapshot> {
    if (remote) {
      try {
        return await remote.read();
      } catch (error) {
        console.error("pay catalog supabase read failed", error instanceof Error ? error.message : error);
      }
    }
    return file.read();
  }
  return {
    async read() {
      const hit = catalogCache.get(key);
      if (hit && Date.now() - hit.at < CATALOG_READ_TTL_MS) return hit.value;
      const pending = catalogInflight.get(key);
      if (pending) return pending;
      const request = load()
        .then((value) => {
          catalogCache.set(key, { at: Date.now(), value });
          catalogInflight.delete(key);
          return value;
        })
        .catch((error: unknown) => {
          catalogInflight.delete(key);
          throw error;
        });
      catalogInflight.set(key, request);
      return request;
    },
    async write(next) {
      catalogCache.delete(key);
      catalogInflight.delete(key);
      if (remote) {
        await remote.write(next);
        return;
      }
      if (env.VERCEL) {
        throw new Error(
          "Catalog edits on Vercel need SUPABASE_SERVICE_ROLE_KEY and the pay_catalog table. Built-in products still check out.",
        );
      }
      await file.write(next);
    },
    async insertIfAbsent(products) {
      catalogCache.delete(key);
      catalogInflight.delete(key);
      if (remote) return remote.insertIfAbsent(products);
      if (env.VERCEL) {
        throw new Error(
          "Catalog edits on Vercel need SUPABASE_SERVICE_ROLE_KEY and the pay_catalog table. Built-in products still check out.",
        );
      }
      return file.insertIfAbsent(products);
    },
  };
}
