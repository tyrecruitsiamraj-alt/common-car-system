/**
 * Detect overlapping active vehicle_bookings before applying exclusion constraints.
 *
 * Usage:
 *   node scripts/check-booking-overlaps.mjs
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
  return merged;
}

const env = loadEnvFromFiles();
const databaseUrl = getDatabaseUrlFromEnv(env).trim();
const pgSsl = ["true", "1", "yes"].includes(String(env.PG_SSL || "").toLowerCase());
const schema = String(
  env.PGSCHEMA || env.DATABASE_SCHEMA || env.POSTGRES_SCHEMA || env.DB_SCHEMA || env.SCHEMA || "",
).trim();
const validSchema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) ? schema : DEFAULT_PG_SCHEMA;

if (!databaseUrl) {
  console.error(`Missing database connection. ${DATABASE_URL_MISSING_HINT}`);
  process.exit(1);
}

const overlapSql = `
  select
    'vehicle'::text as kind,
    a.id::text as booking_a_id,
    b.id::text as booking_b_id,
    a.vehicle_id::text as resource_id,
    a.starts_at as a_starts,
    coalesce(a.completed_at, a.ends_at) as a_ends,
    b.starts_at as b_starts,
    coalesce(b.completed_at, b.ends_at) as b_ends
  from vehicle_bookings a
  join vehicle_bookings b
    on a.vehicle_id = b.vehicle_id
   and a.id < b.id
  where coalesce(a.status, 'active') = 'active'
    and coalesce(b.status, 'active') = 'active'
    and tstzrange(a.starts_at, coalesce(a.completed_at, a.ends_at), '[)')
        && tstzrange(b.starts_at, coalesce(b.completed_at, b.ends_at), '[)')
  union all
  select
    'employee'::text as kind,
    a.id::text as booking_a_id,
    b.id::text as booking_b_id,
    a.employee_id::text as resource_id,
    a.starts_at as a_starts,
    coalesce(a.completed_at, a.ends_at) as a_ends,
    b.starts_at as b_starts,
    coalesce(b.completed_at, b.ends_at) as b_ends
  from vehicle_bookings a
  join vehicle_bookings b
    on a.employee_id = b.employee_id
   and a.id < b.id
  where coalesce(a.status, 'active') = 'active'
    and coalesce(b.status, 'active') = 'active'
    and tstzrange(a.starts_at, coalesce(a.completed_at, a.ends_at), '[)')
        && tstzrange(b.starts_at, coalesce(b.completed_at, b.ends_at), '[)')
  order by kind, booking_a_id, booking_b_id
`;

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

try {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${validSchema.replace(/"/g, "")}", public`);
    const { rows } = await client.query(overlapSql);
    if (rows.length === 0) {
      console.log(`No overlapping active bookings in schema "${validSchema}". Safe to apply migration 034.`);
      process.exit(0);
    }
    console.error(`Found ${rows.length} overlapping active booking pair(s) in schema "${validSchema}":`);
    for (const row of rows) {
      console.error(
        `  - ${row.kind} overlap: booking ${row.booking_a_id} vs ${row.booking_b_id} (resource ${row.resource_id})`,
      );
      console.error(`      [${row.a_starts} – ${row.a_ends}] × [${row.b_starts} – ${row.b_ends}]`);
    }
    console.error("Resolve overlaps before running migrations/034_vehicle_bookings_no_overlap.sql");
    process.exit(1);
  } finally {
    client.release();
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("Check failed:", msg);
  process.exit(1);
} finally {
  await pool.end();
}
