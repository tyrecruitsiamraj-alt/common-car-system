/**
 * สร้าง sequence + คอลัมน์ vehicle_bookings.work_order_no ในทุก schema ที่มีตาราง
 * (กรณี migration 029 ถูกบันทึกแล้วแต่ยังไม่รันบน car_stamp / production)
 *
 * รัน: npm run db:ensure:work-order
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

async function ensureSchema(client, schema) {
  const hasTable = await client.query(
    `select 1 from information_schema.tables
     where table_schema = $1 and table_name = 'vehicle_bookings' limit 1`,
    [schema],
  );
  if (!hasTable.rowCount) {
    console.log(`skip ${schema}.vehicle_bookings (no table)`);
    return;
  }

  const seq = `"${schema}".vehicle_bookings_work_order_seq`;
  const tbl = `"${schema}".vehicle_bookings`;

  await client.query(`create sequence if not exists ${seq} start 1`);
  await client.query(`alter table ${tbl} add column if not exists work_order_no text null`);

  const backfill = await client.query(
    `
    with numbered as (
      select id, row_number() over (order by created_at asc, id asc) as rn
      from ${tbl}
      where work_order_no is null or trim(work_order_no) = ''
    )
    update ${tbl} vb
    set work_order_no = 'BK-' || lpad(n.rn::text, 6, '0')
    from numbered n
    where vb.id = n.id
    returning vb.id
    `,
  );
  const filled = backfill.rowCount ?? 0;

  await client.query(
    `
    select setval(
      '${schema}.vehicle_bookings_work_order_seq'::regclass,
      coalesce(
        (
          select max(cast(substring(work_order_no from 4) as integer))
          from ${tbl}
          where work_order_no ~ '^BK-[0-9]+$'
        ),
        0
      ) + 1,
      false
    )
    `,
  );

  await client.query(
    `
    create unique index if not exists vehicle_bookings_work_order_no_uidx
    on ${tbl} (work_order_no)
    where work_order_no is not null
    `,
  );

  const { rows } = await client.query(
    `select last_value::text as lv from ${seq}`,
  );
  console.log(
    `ok  ${schema}.vehicle_bookings.work_order_no (backfill ${filled} rows, next seq ~ ${rows[0]?.lv ?? '?'})`,
  );
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
    [preferred, DEFAULT_PG_SCHEMA, 'car_stamp', 'jarvis_rm'].filter(
      (s) => s && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s),
    ),
  ),
];

try {
  const client = await pool.connect();
  try {
    for (const schema of schemasToTry) {
      await ensureSchema(client, schema);
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
