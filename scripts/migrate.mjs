/**
 * Run pending SQL migrations in order from migrations/*.sql
 * Uses DATABASE_URL / POSTGRES_URL and PGSCHEMA (search_path); ถ้าไม่ตั้ง PGSCHEMA ใช้ค่า default จาก scripts/schema-constants.mjs (car_stamp)
 *
 * Usage:
 *   node scripts/migrate.mjs           # apply pending
 *   node scripts/migrate.mjs --status  # list applied
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { DEFAULT_PG_SCHEMA } from "./schema-constants.mjs";
import { getDatabaseUrlFromEnv, DATABASE_URL_MISSING_HINT } from "./database-url-from-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const migrationsDir = path.join(root, "migrations");

function loadEnvFromFiles() {
  const merged = { ...process.env };
  for (const name of [".env", ".env.local"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      merged[key] = val;
    }
  }
  const shellPg = String(process.env.PGSCHEMA ?? "").trim();
  if (shellPg) merged.PGSCHEMA = shellPg;
  const shellDs = String(process.env.DATABASE_SCHEMA ?? "").trim();
  if (shellDs) merged.DATABASE_SCHEMA = shellDs;
  return merged;
}

const env = loadEnvFromFiles();
const databaseUrl = getDatabaseUrlFromEnv(env).trim();
const pgSsl = ["true", "1", "yes"].includes(String(env.PG_SSL || "").toLowerCase());
const schema = String(
  env.PGSCHEMA ||
    env.DATABASE_SCHEMA ||
    env.POSTGRES_SCHEMA ||
    env.DB_SCHEMA ||
    env.SCHEMA ||
    "",
).trim();
const validSchema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) ? schema : DEFAULT_PG_SCHEMA;
const replayMigrations = ["1", "true", "yes"].includes(
  String(process.env.DB_REPLAY_MIGRATIONS || "").toLowerCase(),
);
if (!schema || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
  console.warn(`PGSCHEMA / DATABASE_SCHEMA ไม่ได้ตั้งหรือไม่ถูกต้อง — ใช้ ${DEFAULT_PG_SCHEMA} สำหรับ migration`);
}

if (!databaseUrl) {
  console.error(`Missing database connection. ${DATABASE_URL_MISSING_HINT}`);
  process.exit(1);
}

const statusOnly = process.argv.includes("--status");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._jarvis_migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedNames(client) {
  const r = await client.query("SELECT name FROM public._jarvis_migrations ORDER BY name");
  return new Set(r.rows.map((row) => row.name));
}

async function recordMigration(client, name) {
  await client.query("INSERT INTO public._jarvis_migrations (name) VALUES ($1)", [name]);
}

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .filter((f, i, a) => a.indexOf(f) === i)
    .sort();
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

try {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    if (replayMigrations && !statusOnly) {
      console.warn(
        `DB_REPLAY_MIGRATIONS — ลบประวัติใน public._jarvis_migrations แล้วรัน migration ใหม่ทั้งหมดใน schema "${validSchema}" (ใช้เมื่อ car_stamp ว่างแต่ระบบบันทึกว่า migrate แล้ว — ตารางอาจไปอยู่ public)`,
      );
      await client.query("DELETE FROM public._jarvis_migrations");
    }
    const applied = await appliedNames(client);
    const files = listMigrationFiles();

    if (statusOnly) {
      console.log("Migration files:", files.length ? files.join(", ") : "(none)");
      console.log("Applied:", [...applied].sort().join(", ") || "(none)");
      process.exit(0);
    }

    for (const file of files) {
      if (applied.has(file)) continue;
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, "utf8");
      console.log("Applying:", file);
      await client.query("BEGIN");
      try {
        await client.query(`SET LOCAL search_path TO "${String(validSchema).replace(/"/g, "")}", public`);
        await client.query(sql);
        await recordMigration(client, file);
        await client.query("COMMIT");
        console.log("  OK");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
    console.log("Migrations complete.");
  } finally {
    client.release();
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("Migration failed:", msg);
  process.exit(1);
} finally {
  await pool.end();
}
