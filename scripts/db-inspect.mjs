/**
 * ตรวจว่า schema car_stamp (หรือ PGSCHEMA) มีตารางหรือไม่ + สรุป public._jarvis_migrations
 * รัน: npm run db:inspect
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { DEFAULT_PG_SCHEMA } from "./schema-constants.mjs";
import { getDatabaseUrlFromEnv, DATABASE_URL_MISSING_HINT } from "./database-url-from-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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
const schema = String(env.PGSCHEMA || env.DATABASE_SCHEMA || "").trim();
const validSchema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) ? schema : DEFAULT_PG_SCHEMA;

if (!databaseUrl) {
  console.error(`Missing database connection. ${DATABASE_URL_MISSING_HINT}`);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

try {
  const client = await pool.connect();
  try {
    const db = await client.query("select current_database() as db");
    console.log("Database:", db.rows[0]?.db);
    console.log("PGSCHEMA (effective):", validSchema);

    const inSchema = await client.query(
      `select count(*)::int as n from information_schema.tables
       where table_schema = $1 and table_type = 'BASE TABLE'`,
      [validSchema],
    );
    const nApp = inSchema.rows[0]?.n ?? 0;
    console.log(`Tables in schema "${validSchema}":`, nApp);

    if (nApp > 0 && nApp <= 40) {
      const names = await client.query(
        `select table_name from information_schema.tables
         where table_schema = $1 and table_type = 'BASE TABLE' order by table_name`,
        [validSchema],
      );
      console.log("  →", names.rows.map((r) => r.table_name).join(", "));
    }

    const pubVeh = await client.query(
      `select count(*)::int as n from information_schema.tables
       where table_schema = 'public' and table_name = 'vehicles'`,
    );
    const pubUsers = await client.query(
      `select count(*)::int as n from information_schema.tables
       where table_schema = 'public' and table_name = 'users'`,
    );
    console.log("public.vehicles exists:", (pubVeh.rows[0]?.n ?? 0) > 0);
    console.log("public.users exists:", (pubUsers.rows[0]?.n ?? 0) > 0);

    const stampSchema = DEFAULT_PG_SCHEMA;
    if (stampSchema !== validSchema) {
      const stampN = await client.query(
        `select count(*)::int as n from information_schema.tables
         where table_schema = $1 and table_type = 'BASE TABLE'`,
        [stampSchema],
      );
      const sn = stampN.rows[0]?.n ?? 0;
      console.log(`Tables in schema "${stampSchema}" (แอป Car Stamp):`, sn);
      if (sn > 0 && sn <= 40) {
        const snames = await client.query(
          `select table_name from information_schema.tables
           where table_schema = $1 and table_type = 'BASE TABLE' order by table_name`,
          [stampSchema],
        );
        console.log("  →", snames.rows.map((r) => r.table_name).join(", "));
      }
      const stampVeh = await client.query(
        `select count(*)::int as n from information_schema.tables
         where table_schema = $1 and table_name = 'vehicles'`,
        [stampSchema],
      );
      console.log(`${stampSchema}.vehicles exists:`, (stampVeh.rows[0]?.n ?? 0) > 0);
      if (validSchema !== stampSchema && sn === 0) {
        console.warn(
          `\n⚠ PGSCHEMA ชี้ "${validSchema}" แต่ "${stampSchema}" ยังไม่มีตาราง — fleet อ่าน schema จาก env\n` +
            `   แก้ใน .env.local: PGSCHEMA=${stampSchema} แล้วรัน npm run db:migrate:replay && npm run db:seed\n` +
            `   หรือรันครั้งเดียว: set PGSCHEMA=${stampSchema} && npm run db:migrate:replay\n`,
        );
      }
    }

    let migCount = 0;
    try {
      const m = await client.query(
        "select count(*)::int as n from public._jarvis_migrations",
      );
      migCount = m.rows[0]?.n ?? 0;
    } catch {
      /* table missing */
    }
    console.log("Recorded migrations (public._jarvis_migrations):", migCount);

    if (nApp === 0 && migCount > 0) {
      console.warn(
        "\n⚠ schema ว่างแต่มีประวัติ migration — ตารางอาจอยู่ใน public จากรอบเก่า\n" +
          "   แก้: npm run db:migrate:replay   (แล้ว npm run db:seed)\n",
      );
    }
    if (nApp === 0 && migCount === 0) {
      console.warn(
        "\n⚠ ยังไม่มี migration ใน DB นี้ — รัน npm run db:migrate แล้ว npm run db:seed\n",
      );
    }
  } finally {
    client.release();
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await pool.end();
}
