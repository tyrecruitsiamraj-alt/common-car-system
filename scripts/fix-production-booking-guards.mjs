/**
 * Repair invalid completed_at values and apply migration 034 constraints on car_stamp.
 * Usage: PGSCHEMA=car_stamp node scripts/fix-production-booking-guards.mjs
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

  const repair = await client.query(`
    update vehicle_bookings
    set completed_at = least(ends_at, greatest(starts_at, completed_at))
    where completed_at is not null
      and (completed_at > ends_at or completed_at < starts_at)
      and coalesce(status, 'active') = 'active'
    returning id
  `);
  console.log(`Repaired ${repair.rowCount} booking(s) with invalid completed_at`);

  await client.query('create extension if not exists btree_gist');
  await client.query(`
    alter table vehicle_bookings
      drop constraint if exists vehicle_bookings_vehicle_no_overlap
  `);
  await client.query(`
    alter table vehicle_bookings
      add constraint vehicle_bookings_vehicle_no_overlap
      exclude using gist (
        vehicle_id with =,
        tstzrange(starts_at, coalesce(completed_at, ends_at), '[)') with &&
      )
      where (coalesce(status, 'active') = 'active')
  `);
  await client.query(`
    alter table vehicle_bookings
      drop constraint if exists vehicle_bookings_employee_no_overlap
  `);
  await client.query(`
    alter table vehicle_bookings
      add constraint vehicle_bookings_employee_no_overlap
      exclude using gist (
        employee_id with =,
        tstzrange(starts_at, coalesce(completed_at, ends_at), '[)') with &&
      )
      where (coalesce(status, 'active') = 'active')
  `);

  const cons = await client.query(`
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

  console.log(
    `Schema ${schema}: overlap constraints present: ${cons.rows.map((r) => r.conname).join(', ')}`,
  );
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error('Fix failed:', msg);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
