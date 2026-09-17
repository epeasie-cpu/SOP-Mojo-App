#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const committedSchema = join(root, "prisma", "schema.prisma");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env"));
loadEnvFile(join(root, ".env.local"));

const url = process.env.DATABASE_URL || "file:./dev.db";
const provider = /^postgres(ql)?:/i.test(url) ? "postgresql" : "sqlite";

let schemaPath = committedSchema;
if (provider === "postgresql") {
  const outDir = join(root, "prisma", ".generated");
  mkdirSync(outDir, { recursive: true });
  schemaPath = join(outDir, "schema.prisma");
  const schema = readFileSync(committedSchema, "utf8").replace(
    /provider\s*=\s*"(sqlite|postgresql)"/,
    `provider = "${provider}"`,
  );
  writeFileSync(schemaPath, schema);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prisma-run.mjs <prisma args>");
  process.exit(1);
}

const prismaArgs = [...args];
if (!prismaArgs.includes("--schema")) {
  prismaArgs.push("--schema", schemaPath);
}

const result = spawnSync("npx", ["prisma", ...prismaArgs], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: url },
});

process.exit(result.status ?? 1);
