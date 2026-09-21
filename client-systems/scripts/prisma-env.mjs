/**
 * Shared Prisma env/schema helpers for SQLite locally and
 * dedicated Supabase Postgres on Vercel.
 */

export function isPostgresUrl(url) {
  return /^postgres(ql)?:/i.test(String(url || ""));
}

export function isNeonUrl(url) {
  return /neon\.(tech|build)|neon\.database/i.test(String(url || ""));
}

export function isSupabaseUrl(url) {
  return /supabase\.(com|co)/i.test(String(url || ""));
}

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function resolveDatabaseUrl(env = process.env) {
  return env.DATABASE_URL || "file:./dev.db";
}

export function rewriteSchemaForProvider(schema, { provider, withDirectUrl }) {
  let out = schema.replace(
    /provider\s*=\s*"(sqlite|postgresql)"/,
    `provider = "${provider}"`,
  );
  if (provider === "postgresql" && withDirectUrl && !/directUrl\s*=/.test(out)) {
    out = out.replace(
      /(url\s*=\s*env\("DATABASE_URL"\))/,
      `$1\n  directUrl = env("DIRECT_URL")`,
    );
  }
  return out;
}

/**
 * Neon is rejected for this app. Vercel must use the dedicated
 * Client Systems Supabase project (not Builder).
 */
/**
 * @param {string} url
 * @param {Record<string, string | undefined>} [env]
 */
export function assertProductionDatabaseUrl(url, env = process.env) {
  if (isNeonUrl(url)) {
    throw new Error(
      "Neon is not used for Client Systems. Set DATABASE_URL to the dedicated Supabase project (not Builder).",
    );
  }
  if (!env.VERCEL) return;
  if (!isPostgresUrl(url)) {
    throw new Error(
      "On Vercel, DATABASE_URL must be the dedicated Client Systems Supabase Postgres URL.",
    );
  }
  if (!isSupabaseUrl(url)) {
    throw new Error(
      "On Vercel, DATABASE_URL must point at the dedicated Client Systems Supabase project, not another host.",
    );
  }
}
