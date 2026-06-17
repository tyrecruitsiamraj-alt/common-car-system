import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const EMAIL = 'admin@example.com';
const SCHEMA = 'car_stamp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env', '.env.local']) {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(
  `select id, email, full_name, role from "${SCHEMA}".users where lower(email) = lower($1::text)`,
  [EMAIL],
);
const user = rows[0];
if (!user) {
  console.error('User not found:', EMAIL);
  process.exit(1);
}

await client.query(
  `
  insert into "${SCHEMA}".fleet_booking_permissions (id, completed_time_editor_user_id, updated_by_user_id, updated_at)
  values ('default', $1::uuid, $1::uuid, now())
  on conflict (id) do update set
    completed_time_editor_user_id = excluded.completed_time_editor_user_id,
    updated_by_user_id = excluded.updated_by_user_id,
    updated_at = now()
  `,
  [user.id],
);

console.log('Assigned completed-time editor:', user.email, `(${user.full_name}, ${user.role})`);
await client.end();
