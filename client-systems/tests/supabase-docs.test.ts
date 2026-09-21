import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("dedicated Supabase migration docs", () => {
  it("ships Ryan's click guide and SQL without Neon as a production option", () => {
    expect(existsSync(join(root, "MIGRATION.md"))).toBe(true);
    expect(existsSync(join(root, "supabase/0001_init.sql"))).toBe(true);
    expect(existsSync(join(root, "supabase/0002_rls_and_prisma_role.sql"))).toBe(
      true,
    );

    const migration = read("MIGRATION.md");
    const readme = read("README.md");
    const envExample = read(".env.example");
    const initSql = read("supabase/0001_init.sql");
    const rlsSql = read("supabase/0002_rls_and_prisma_role.sql");

    expect(migration).toMatch(/dedicated Supabase/i);
    expect(migration).toMatch(/Do not.*reuse Builder/i);
    expect(migration).toMatch(/Do not.*Neon/i);
    expect(migration).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(migration).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(migration).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(migration).toContain("DIRECT_URL");
    expect(migration).toMatch(/sessions table/i);
    expect(migration).toMatch(/\*\*None\*\*/);
    expect(migration).not.toMatch(/https:\/\/(console\.)?neon\.tech/i);
    expect(migration).not.toMatch(/claim your Neon/i);

    expect(readme).toMatch(/dedicated Supabase/i);
    expect(readme).not.toMatch(/Supabase or Neon/);
    expect(readme).not.toMatch(/Supabase\/Neon/);

    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=");
    expect(envExample).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(envExample).toContain("DIRECT_URL=");
    expect(envExample).toMatch(/file:\.\/dev\.db/);
    expect(envExample).not.toMatch(/neon\.(tech|build)/i);

    expect(initSql).toContain('CREATE TABLE "User"');
    expect(initSql).toContain('CREATE TABLE "Workspace"');
    expect(initSql).toContain('CREATE TABLE "Membership"');
    expect(initSql).not.toMatch(/CREATE TABLE "Session"/);
    expect(rlsSql).toMatch(/enable row level security/i);
    expect(rlsSql).toContain("REPLACE_WITH_GENERATED_PASSWORD");
    expect(rlsSql).toContain('create user "prisma"');
  });
});
