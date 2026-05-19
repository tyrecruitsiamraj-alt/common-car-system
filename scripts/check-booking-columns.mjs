import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { DEFAULT_PG_SCHEMA } from "./schema-constants.mjs";
import { getDatabaseUrlFromEnv } from "./database-url-from-env.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  const merged = { ...process.env };
  for (const name of [".env", ".env.local"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      let val = t.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      merged[t.slice(0, i).trim()] = val;
    }
  }
  return merged;
}

const env = loadEnv();
const pool = new pg.Pool({
  connectionString: getDatabaseUrlFromEnv(env),
  ssl: ["true", "1", "yes"].includes(String(env.PG_SSL || "").toLowerCase())
    ? { rejectUnauthorized: false }
    : undefined,
  max: 1,
});
const client = await pool.connect();
try {
  for (const schema of ["car_stamp", "jarvis_rm", String(env.PGSCHEMA || "").trim()].filter(Boolean)) {
    const r = await client.query(
      `select column_name from information_schema.columns
       where table_schema = $1 and table_name = 'vehicle_bookings' order by ordinal_position`,
      [schema],
    );
    const cols = r.rows.map((x) => x.column_name);
    const hasStatus = cols.includes("status");
    const hasDest = cols.includes("destination");
    console.log(`schema ${schema}:`, cols.length ? cols.join(", ") : "(no table)", hasStatus ? "" : " MISSING status", hasDest ? "" : " MISSING destination");
  }
} finally {
  client.release();
  await pool.end();
}
