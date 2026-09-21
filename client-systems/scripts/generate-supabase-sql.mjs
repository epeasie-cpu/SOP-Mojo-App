#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rewriteSchemaForProvider } from "./prisma-env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const committedSchema = join(root, "prisma", "schema.prisma");
const outDir = join(root, "prisma", ".generated");
mkdirSync(outDir, { recursive: true });
const schemaPath = join(outDir, "schema.prisma");

const schema = rewriteSchemaForProvider(readFileSync(committedSchema, "utf8"), {
  provider: "postgresql",
  withDirectUrl: true,
});
writeFileSync(schemaPath, schema);

const result = spawnSync(
  "npx",
  [
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    schemaPath,
    "--script",
  ],
  {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://prisma.placeholder:placeholder@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      DIRECT_URL:
        process.env.DIRECT_URL ||
        "postgresql://prisma.placeholder:placeholder@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    },
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "prisma migrate diff failed\n");
  process.exit(result.status ?? 1);
}

const header = `-- Generated from prisma/schema.prisma via scripts/generate-supabase-sql.mjs
-- Dedicated Client Systems Supabase project (not Builder, not Neon).
-- Paste into SQL Editor, or run \`npm run db:push\` against DIRECT_URL instead.

`;

const sql = `${header}${result.stdout}`;
const outFile = join(root, "supabase", "0001_init.sql");
writeFileSync(outFile, sql);
process.stdout.write(`Wrote ${outFile}\n`);
