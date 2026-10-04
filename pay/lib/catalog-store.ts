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
import { seedCatalog } from "./seed";
import { readAdminConfig } from "./fulfillment";

export type CatalogStore = {
  read(): Promise<CatalogSnapshot>;
  write(next: CatalogSnapshot): Promise<void>;
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
      });
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
  };
}

export function catalogFilePath(): string {
  return path.join(process.cwd(), "data", "catalog.json");
}

export function createCatalogStore(env: NodeJS.ProcessEnv = process.env): CatalogStore {
  const admin = readAdminConfig(env);
  const file = fileCatalogStore(catalogFilePath());
  const remote = admin ? supabaseCatalogStore(admin) : null;
  return {
    async read() {
      if (remote) {
        try {
          return await remote.read();
        } catch (error) {
          console.error("pay catalog supabase read failed", error instanceof Error ? error.message : error);
        }
      }
      return file.read();
    },
    async write(next) {
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
  };
}
