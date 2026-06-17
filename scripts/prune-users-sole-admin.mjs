/**
 * Keep admin@example.com as sole admin; delete other users except Toyota (@toyota-asia.com).
 * Usage: node scripts/prune-users-sole-admin.mjs [--dry-run] [--schema=car_stamp]
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const SOLE_ADMIN_EMAIL = 'admin@example.com';
const TOYOTA_EMAIL_SUFFIX = '@toyota-asia.com';

function shouldKeepUser(email) {
  const e = email.toLowerCase();
  return e === SOLE_ADMIN_EMAIL || e.endsWith(TOYOTA_EMAIL_SUFFIX);
}

const dryRun = process.argv.includes('--dry-run');
const schemaArg = process.argv.find((a) => a.startsWith('--schema='));
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
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

const env = loadEnv();
const databaseUrl = String(env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pgSsl = ['true', '1', 'yes'].includes(String(env.PG_SSL || '').toLowerCase());
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

const schemas = schemaArg
  ? [schemaArg.slice('--schema='.length)]
  : ['car_stamp', 'jarvis_rm'];

for (const schema of schemas) {
  const tableExists = await client.query(
    `select 1 from information_schema.tables where table_schema = $1 and table_name = 'users'`,
    [schema],
  );
  if (!tableExists.rowCount) {
    console.log(`[${schema}] skip — no users table`);
    continue;
  }

  const { rows: before } = await client.query(
    `select id, email, role from "${schema}".users order by lower(email)`,
  );
  console.log(`[${schema}] users before: ${before.length}`);

  const adminUser = before.find((u) => u.email.toLowerCase() === SOLE_ADMIN_EMAIL);
  if (!adminUser) {
    console.error(`[${schema}] missing ${SOLE_ADMIN_EMAIL} — run db:seed first`);
    continue;
  }

  const toDelete = before.filter((u) => !shouldKeepUser(u.email));
  if (dryRun) {
    console.log(
      `[${schema}] would keep:`,
      before.filter((u) => shouldKeepUser(u.email)).map((u) => u.email).join(', '),
    );
    console.log(`[${schema}] would delete:`, toDelete.map((u) => u.email).join(', ') || '(none)');
    console.log(`[${schema}] would promote ${SOLE_ADMIN_EMAIL} to admin`);
    continue;
  }

  await client.query('BEGIN');
  try {
    await client.query(`SET search_path TO "${schema.replace(/"/g, '')}", public`);

    const permExists = await client.query(
      `select 1 from information_schema.tables where table_schema = $1 and table_name = 'fleet_booking_permissions'`,
      [schema],
    );
    if (permExists.rowCount) {
      await client.query(
        `update "${schema}".fleet_booking_permissions
         set completed_time_editor_user_id = null,
             updated_by_user_id = null,
             updated_at = now()
         where id = 'default'`,
      );
    }

    await client.query(
      `update "${schema}".users
       set role = 'admin', is_active = true, updated_at = now()
       where lower(email) = lower($1::text)`,
      [SOLE_ADMIN_EMAIL],
    );

    const { rowCount } = await client.query(
      `delete from "${schema}".users where not (
         lower(email) = lower($1::text)
         or lower(email) like '%' || lower($2::text)
       )`,
      [SOLE_ADMIN_EMAIL, TOYOTA_EMAIL_SUFFIX],
    );

    await client.query('COMMIT');
    console.log(`[${schema}] deleted ${rowCount} user(s); kept admin + Toyota`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

await client.end();
console.log(dryRun ? 'Dry run complete.' : 'Prune complete.');
