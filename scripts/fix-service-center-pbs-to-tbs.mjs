/**
 * แก้ไขชื่อศูนย์ "PBS กม.25" -> "TBS กม.25" ในเคส issue_reports (หมวด รถเข้าศูนย์) ที่มีผู้กรอกไว้แล้ว
 * ชื่อศูนย์ถูกแก้ใน src/lib/issueReportConfig.ts แล้ว — สคริปต์นี้ไล่แก้ข้อมูลเก่าใน DB ให้ตรงกัน
 *
 * รัน: node scripts/fix-service-center-pbs-to-tbs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { DEFAULT_PG_SCHEMA } from './schema-constants.mjs';
import { getDatabaseUrlFromEnv, DATABASE_URL_MISSING_HINT } from './database-url-from-env.mjs';

const OLD_NAME = 'PBS กม.25';
const NEW_NAME = 'TBS กม.25';

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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
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

const preferred = String(env.PGSCHEMA || env.DATABASE_SCHEMA || env.POSTGRES_SCHEMA || '').trim();
const schemasToTry = [...new Set([preferred, DEFAULT_PG_SCHEMA, 'jarvis_rm', 'car_stamp'].filter(
  (s) => s && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s),
))];

try {
  const client = await pool.connect();
  try {
    for (const schema of schemasToTry) {
      const hasTable = await client.query(
        `select 1 from information_schema.tables where table_schema = $1 and table_name = 'issue_reports' limit 1`,
        [schema],
      );
      if (!hasTable.rowCount) {
        console.log(`skip ${schema}.issue_reports (no table)`);
        continue;
      }

      const before = await client.query(
        `select id from "${schema.replace(/"/g, '')}".issue_reports
         where category = 'vehicle-service' and data->>'service_center' = $1`,
        [OLD_NAME],
      );
      if (!before.rowCount) {
        console.log(`ok   ${schema}.issue_reports (no rows with "${OLD_NAME}")`);
        continue;
      }

      const updated = await client.query(
        `update "${schema.replace(/"/g, '')}".issue_reports
         set data = jsonb_set(data, '{service_center}', to_jsonb($2::text))
         where category = 'vehicle-service' and data->>'service_center' = $1`,
        [OLD_NAME, NEW_NAME],
      );
      console.log(`fix  ${schema}.issue_reports: updated ${updated.rowCount} row(s) "${OLD_NAME}" -> "${NEW_NAME}"`);
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
