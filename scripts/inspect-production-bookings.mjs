/**
 * Inspect production car_stamp booking data issues (no secrets printed).
 * Usage: PGSCHEMA=car_stamp node scripts/inspect-production-bookings.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getDatabaseUrlFromEnv, DATABASE_URL_MISSING_HINT } from './database-url-from-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvFromFiles() {
  const merged = { ...process.env };
  for (const name of ['.env', '.env.local']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
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
const schema = String(env.PGSCHEMA || 'car_stamp').trim() || 'car_stamp';
const databaseUrl = getDatabaseUrlFromEnv(env).trim();
if (!databaseUrl) {
  console.error(DATABASE_URL_MISSING_HINT);
  process.exit(2);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: ['true', '1', 'yes'].includes(String(env.PG_SSL || '').toLowerCase())
    ? { rejectUnauthorized: false }
    : undefined,
  max: 1,
});

const client = await pool.connect();
try {
  await client.query(`SET search_path TO "${schema.replace(/"/g, '')}", public`);

  const invalidOrder = await client.query(`
    select id, starts_at, ends_at, completed_at, status
    from vehicle_bookings
    where coalesce(status, 'active') = 'active'
      and ends_at <= starts_at
    limit 20
  `);

  const completedBeforeStart = await client.query(`
    select id, starts_at, ends_at, completed_at, status
    from vehicle_bookings
    where coalesce(status, 'active') = 'active'
      and completed_at is not null
      and completed_at < starts_at
    limit 20
  `);

  const completedAfterEnds = await client.query(`
    select id, starts_at, ends_at, completed_at, status
    from vehicle_bookings
    where coalesce(status, 'active') = 'active'
      and completed_at is not null
      and completed_at > ends_at
    limit 20
  `);

  const constraints = await client.query(`
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = $1
      and t.relname = 'vehicle_bookings'
      and c.conname in (
        'vehicle_bookings_vehicle_no_overlap',
        'vehicle_bookings_employee_no_overlap'
      )
  `, [schema]);

  console.log(JSON.stringify({
    schema,
    invalidOrderCount: invalidOrder.rows.length,
    invalidOrderIds: invalidOrder.rows.map((r) => r.id),
    completedBeforeStartCount: completedBeforeStart.rows.length,
    completedBeforeStartIds: completedBeforeStart.rows.map((r) => r.id),
    completedAfterEndsCount: completedAfterEnds.rows.length,
    completedAfterEndsIds: completedAfterEnds.rows.map((r) => r.id),
    overlapConstraints: constraints.rows.map((r) => r.conname),
  }, null, 2));
} finally {
  client.release();
  await pool.end();
}
