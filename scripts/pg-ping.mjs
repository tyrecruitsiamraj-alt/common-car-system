/**
 * ทดสอบ DATABASE_URL — อ่านจาก .env แล้ว .env.local (ค่าใน .env.local ทับ .env)
 * รหัสและ connection string ใส่แค่บนเครื่องคุณ ไม่ต้องส่งให้ใคร
 * รัน: npm run db:ping
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
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
const pgSsl = ["true", "1", "yes"].includes(
  String(env.PG_SSL || "").toLowerCase(),
);
const schema = String(env.PGSCHEMA || env.DATABASE_SCHEMA || "").trim();
const { DEFAULT_PG_SCHEMA } = await import("./schema-constants.mjs");
const validSchema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) ? schema : DEFAULT_PG_SCHEMA;

if (!databaseUrl) {
  console.error(
    `ไม่พบการเชื่อมต่อฐานข้อมูล — ${DATABASE_URL_MISSING_HINT}`,
  );
  process.exit(1);
}

// ไม่พิมพ์ URL เต็ม (มีรหัสผ่าน)
try {
  const u = new URL(databaseUrl.replace(/^postgresql:/i, "http:"));
  console.log(
    "Host:",
    u.hostname,
    "Port:",
    u.port || "5432",
    "User:",
    u.username,
    "DB:",
    u.pathname?.slice(1) || "(?)",
  );
} catch {
  console.log("รูปแบบ DATABASE_URL อาจผิด — ต้องเป็น postgresql://user:pass@host:port/dbname");
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

try {
  const client = await pool.connect();
  try {
    const safe = validSchema.replace(/"/g, "");
    await client.query(`SET search_path TO "${safe}", public`);
    const r = await client.query(
      "select current_user, current_database(), current_schema() as app_schema",
    );
    console.log("OK — เชื่อมต่อได้:", r.rows[0]);
  } finally {
    client.release();
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("ล้มเหลว:", msg);
  if (/password|authentication|login denied/i.test(msg)) {
    console.error(`
คำแนะนำ:
  • เปิด DBeaver ที่เชื่อมได้ → ดู User name / Password ให้ตรงกับ DATABASE_URL ทุกตัว
  • PostgreSQL มักใช้ user "postgres" ไม่ใช่ "root" — ถ้า DBeaver ใช้ postgres ให้ใส่ใน URL ด้วย
  • ถ้ารหัสมีอักขระพิเศษ (@ : / ? # %) ต้อง encode ใน URL (เช่น @ → %40)
  • ลอง PG_SSL=false หรือ true สลับดู`);
  }
  process.exit(1);
} finally {
  await pool.end();
}
