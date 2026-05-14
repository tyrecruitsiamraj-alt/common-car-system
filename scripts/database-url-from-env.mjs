/**
 * Mirror api/_lib/env.ts getDatabaseUrl() — keep key list in sync when changing either file.
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

function buildDatabaseUrlFromPgEnv(env) {
  const host = String(env.PGHOST || "").trim();
  const user = String(env.PGUSER || "").trim();
  const db = String(env.PGDATABASE || "").trim();
  if (!host || !user || !db) return "";
  const port = String(env.PGPORT || "5432").trim() || "5432";
  const pass = env.PGPASSWORD;
  const passStr = pass !== undefined ? String(pass) : "";
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
  "Set DATABASE_URL, POSTGRES_URL, NEON_DATABASE_URL, SUPABASE_DATABASE_URL, POSTGRES_PRISMA_URL, PRISMA_DATABASE_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL_UNPOOLED, or PGHOST+PGUSER+PGDATABASE (+PGPASSWORD, PGPORT). See .env.example.";
