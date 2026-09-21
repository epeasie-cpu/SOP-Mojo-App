import { describe, expect, it } from "vitest";
import {
  assertProductionDatabaseUrl,
  isNeonUrl,
  isPostgresUrl,
  isSupabaseUrl,
  resolveDatabaseUrl,
  rewriteSchemaForProvider,
} from "../scripts/prisma-env.mjs";

const sqliteSchema = `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
`;

describe("prisma-env", () => {
  it("treats postgres URLs as Postgres and sqlite as local", () => {
    expect(isPostgresUrl("postgresql://x")).toBe(true);
    expect(isPostgresUrl("postgres://x")).toBe(true);
    expect(isPostgresUrl("file:./dev.db")).toBe(false);
    expect(resolveDatabaseUrl({})).toBe("file:./dev.db");
  });

  it("rejects Neon hosts and accepts dedicated Supabase pooler hosts", () => {
    expect(isNeonUrl("postgresql://user@ep-foo.us-east-1.aws.neon.tech/neondb")).toBe(
      true,
    );
    expect(
      isSupabaseUrl(
        "postgresql://prisma.abc:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      ),
    ).toBe(true);
    expect(() =>
      assertProductionDatabaseUrl("postgresql://u:p@ep-x.neon.tech/db", {}),
    ).toThrow(/Neon is not used/);
  });

  it("requires a Supabase Postgres URL on Vercel", () => {
    expect(() =>
      assertProductionDatabaseUrl("file:./dev.db", { VERCEL: "1" }),
    ).toThrow(/dedicated Client Systems Supabase/);
    expect(() =>
      assertProductionDatabaseUrl("postgresql://u:p@db.example.com/db", {
        VERCEL: "1",
      }),
    ).toThrow(/not another host/);
    expect(() =>
      assertProductionDatabaseUrl(
        "postgresql://prisma.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
        { VERCEL: "1" },
      ),
    ).not.toThrow();
  });

  it("rewrites sqlite schema to postgresql with DIRECT_URL", () => {
    const out = rewriteSchemaForProvider(sqliteSchema, {
      provider: "postgresql",
      withDirectUrl: true,
    });
    expect(out).toContain('provider = "postgresql"');
    expect(out).toContain('directUrl = env("DIRECT_URL")');
    expect(out).toContain('url      = env("DATABASE_URL")');
  });
});
