/**
 * Restore Toyota fleet users deleted by mistake.
 * Password: SEED_USER_PASSWORD or ChangeMe123! (users must change if they had custom passwords).
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const TOYOTA_USERS = [
  {
    email: 'kittisak_kae@toyota-asia.com',
    full_name: 'Kittisak Kae',
    role: 'staff',
  },
  {
    email: 'tma_driverco1_siamraj@toyota-asia.com',
    full_name: 'TMA Driver Co1',
    role: 'staff',
  },
  {
    email: 'tma_driverco4_siamraj@toyota-asia.com',
    full_name: 'TMA Driver Co4',
    role: 'staff',
  },
  {
    id: '535142a3-735a-4869-a6ba-beca109ada75',
    email: 'tma_driverco5_siamraj@toyota-asia.com',
    full_name: 'tma_driverco5_siamraj@toyota-asia.com',
    role: 'staff',
  },
];

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

const tempPassword = (env.SEED_USER_PASSWORD || 'ChangeMe123!').trim();
const pgSsl = ['true', '1', 'yes'].includes(String(env.PG_SSL || '').toLowerCase());
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
});
await client.connect();

const schema = 'car_stamp';
const hash = await bcrypt.hash(tempPassword, 12);

for (const u of TOYOTA_USERS) {
  const email = u.email.toLowerCase();
  const existing = await client.query(
    `select id, email from "${schema}".users where lower(email) = lower($1::text)`,
    [email],
  );
  if (existing.rowCount) {
    console.log('already exists:', email);
    continue;
  }

  if (u.id) {
    await client.query(
      `
      insert into "${schema}".users (id, email, password_hash, role, full_name, is_active)
      values ($1::uuid, lower($2::text), $3, $4, $5, true)
      `,
      [u.id, email, hash, u.role, u.full_name],
    );
  } else {
    await client.query(
      `
      insert into "${schema}".users (email, password_hash, role, full_name, is_active)
      values (lower($1::text), $2, $3, $4, true)
      `,
      [email, hash, u.role, u.full_name],
    );
  }
  console.log('restored:', email);
}

const { rows } = await client.query(
  `select email, role, full_name from "${schema}".users order by lower(email)`,
);
console.log(`\n[${schema}] users now (${rows.length}):`);
for (const r of rows) console.log(`  ${r.email} (${r.role}) — ${r.full_name}`);
console.log(`\nTemporary password for restored accounts: ${tempPassword}`);

await client.end();
