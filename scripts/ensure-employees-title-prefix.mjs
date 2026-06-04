/**
 * เพิ่มคอลัมน์ employees.title_prefix ในทุก schema ที่มีตาราง employees
 * (กรณี migration 028 ถูกบันทึกแล้วแต่รันไม่ครบทุก schema)
 *
 * รัน: npm run db:ensure:title-prefix
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
         where table_schema = $1 and table_name = 'employees' limit 1`,
        [schema],
      );
      if (!hasTable.rowCount) {
        console.log(`skip ${schema}.employees (no table)`);
        continue;
      }
      const hasCol = await client.query(
        `select 1 from information_schema.columns
         where table_schema = $1 and table_name = 'employees' and column_name = 'title_prefix' limit 1`,
        [schema],
      );
      if (hasCol.rowCount) {
        console.log(`ok  ${schema}.employees.title_prefix (already exists)`);
        continue;
      }
      await client.query(
        `alter table "${schema.replace(/"/g, '')}".employees add column title_prefix text null`,
      );
      console.log(`add ${schema}.employees.title_prefix`);
    }
    console.log('Done.');
  } finally {
    client.release();
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await pool.end();
}
