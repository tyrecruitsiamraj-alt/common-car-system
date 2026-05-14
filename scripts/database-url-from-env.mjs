/**
 * Mirror api/_lib/env.ts getDatabaseUrl() — keep alias lists in sync when changing either file.
 * @param {Record<string, string | undefined>} env
 */
const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "NEON_DATABASE_URL",
  "SUPABASE_DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "PRISMA_DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
];

function firstFromEnv(env, keys) {
  for (const k of keys) {
    const t = String(env[k] || "").trim();
    if (t) return t;
  }
  return "";
}

function buildDatabaseUrlFromPgEnv(env) {
  const host = firstFromEnv(env, ["PGHOST", "POSTGRES_HOST", "PG_HOST", "DB_HOST"]);
  const user = firstFromEnv(env, ["PGUSER", "POSTGRES_USER", "PG_USER", "DB_USER"]);
  const db = firstFromEnv(env, [
    "PGDATABASE",
    "POSTGRES_DATABASE",
    "POSTGRES_DB",
    "PG_DATABASE",
    "DB_NAME",
    "DATABASE_NAME",
  ]);
  if (!host || !user || !db) return "";
  const port = firstFromEnv(env, ["PGPORT", "POSTGRES_PORT", "PG_PORT", "DB_PORT"]) || "5432";
  const passStr = firstFromEnv(env, [
    "PGPASSWORD",
    "POSTGRES_PASSWORD",
    "PG_PASSWORD",
    "DB_PASSWORD",
  ]);
  const auth =
    passStr !== ""
      ? `${encodeURIComponent(user)}:${encodeURIComponent(passStr)}`
      : encodeURIComponent(user);
  return `postgresql://${auth}@${host}:${port}/${encodeURIComponent(db)}`;
}

export function getDatabaseUrlFromEnv(env) {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const t = String(env[key] || "").trim();
    if (t) return t;
  }
  return buildDatabaseUrlFromPgEnv(env) || "";
}

export const DATABASE_URL_MISSING_HINT =
  "Set DATABASE_URL (or POSTGRES_URL / NEON_DATABASE_URL / …), or split vars: PGHOST+PGUSER+PGDATABASE (aliases: POSTGRES_HOST+POSTGRES_USER+POSTGRES_DB, DB_HOST+DB_USER+DB_NAME) + password keys PGPASSWORD / POSTGRES_PASSWORD / DB_PASSWORD + PGPORT / POSTGRES_PORT. Schema: PGSCHEMA or DATABASE_SCHEMA. Names are case-sensitive on Vercel. See .env.example.";
