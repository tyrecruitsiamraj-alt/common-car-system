/**
 * เพิ่มคอลัมน์ vehicle_bookings.document_no ในทุก schema ที่มีตาราง
 *
 * รัน: npm run db:ensure:document-no
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { DEFAULT_PG_SCHEMA } from './schema-constants.mjs';
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
const databaseUrl = getDatabaseUrlFromEnv(env).trim();
const pgSsl = ['true', '1', 'yes'].includes(String(env.PG_SSL || '').toLowerCase());

if (!databaseUrl) {
  console.error(`Missing database connection. ${DATABASE_URL_MISSING_HINT}`);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
  max: 1,
});

const preferred = String(
  env.PGSCHEMA || env.DATABASE_SCHEMA || env.POSTGRES_SCHEMA || '',
).trim();

const schemasToTry = [
  ...new Set(
    [preferred, DEFAULT_PG_SCHEMA, 'jarvis_rm', 'car_stamp'].filter(
      (s) => s && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s),
    ),
  ),
];

try {
  const client = await pool.connect();
  try {
    for (const schema of schemasToTry) {
      const hasTable = await client.query(
        `select 1 from information_schema.tables
         where table_schema = $1 and table_name = 'vehicle_bookings' limit 1`,
        [schema],
      );
      if (!hasTable.rowCount) {
        console.log(`skip ${schema}.vehicle_bookings (no table)`);
        continue;
      }
      await client.query(
        `alter table "${schema}".vehicle_bookings add column if not exists document_no text null`,
      );
      await client.query(
        `create index if not exists vehicle_bookings_document_no_idx
         on "${schema}".vehicle_bookings (document_no)
         where document_no is not null`,
      ).catch(() => undefined);
      console.log(`ok ${schema}.vehicle_bookings.document_no`);
    }
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
