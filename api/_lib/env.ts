import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const envDir =
  typeof import.meta.url === 'string'
    ? path.dirname(fileURLToPath(import.meta.url))
    : /* cjs fallback */ typeof __dirname !== 'undefined'
      ? __dirname
      : process.cwd();

/** โฟลเดอร์ที่มี .env.local (มักเป็น root โปรเจกต์) */
function getProjectRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, '.env.local'))) return cwd;
  if (fs.existsSync(path.join(cwd, '.env'))) return cwd;
  const fromApiLib = path.resolve(envDir, '..', '..');
  if (fs.existsSync(path.join(fromApiLib, '.env.local'))) return fromApiLib;
  if (fs.existsSync(path.join(fromApiLib, '.env'))) return fromApiLib;
  return cwd;
}

const DB_ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'PRISMA_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'NEON_DATABASE_URL',
  'SUPABASE_DATABASE_URL',
  'SUPABASE_DB_URL',
  'DATABASE_PRIVATE_URL',
  'PGHOST',
  'POSTGRES_HOST',
  'PG_HOST',
  'DB_HOST',
  'PGUSER',
  'POSTGRES_USER',
  'PG_USER',
  'DB_USER',
  'PGPASSWORD',
  'POSTGRES_PASSWORD',
  'PG_PASSWORD',
  'DB_PASSWORD',
  'PGDATABASE',
  'POSTGRES_DATABASE',
  'POSTGRES_DB',
  'PG_DATABASE',
  'DB_NAME',
  'DATABASE_NAME',
  'PGPORT',
  'POSTGRES_PORT',
  'PG_PORT',
  'DB_PORT',
  'PGSCHEMA',
  'DATABASE_SCHEMA',
  'POSTGRES_SCHEMA',
  'DB_SCHEMA',
  'SCHEMA',
  'PG_SSL',
] as const;

let localDbEnvApplied = false;

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
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
    out[key] = val;
  }
  return out;
}

/**
 * vercel dev อาจใส่ DATABASE_URL จาก Project Settings ที่ผิด/ว่าง ทับ .env.local
 * โหลด .env แล้ว .env.local จากโฟลเดอร์โปรเจกต์ ให้คีย์ DB จากไฟล์ชนะ (เหมือน db:ping)
 */
function applyLocalDbEnvFromFiles(): void {
  if (localDbEnvApplied) return;
  localDbEnvApplied = true;

  if (process.env.JARVIS_SKIP_LOCAL_ENV === '1') return;
  if (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production') return;

  const root = getProjectRoot();
  const merged: Record<string, string> = {};
  for (const name of ['.env', '.env.local']) {
    const vars = parseEnvFile(path.join(root, name));
    for (const k of DB_ENV_KEYS) {
      const v = vars[k];
      if (v !== undefined && String(v).trim() !== '') {
        merged[k] = String(v).trim();
      }
    }
  }
  for (const k of DB_ENV_KEYS) {
    const v = merged[k];
    if (v !== undefined) process.env[k] = v;
  }
}

applyLocalDbEnvFromFiles();

/** ลำดับเดียวกับที่ serverless / migrate ควรใช้ — รองรับชื่อตัวแปรจาก Vercel / Neon / Prisma / Supabase */
const DATABASE_URL_ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'NEON_DATABASE_URL',
  'SUPABASE_DATABASE_URL',
  'SUPABASE_DB_URL',
  'DATABASE_PRIVATE_URL',
  'POSTGRES_PRISMA_URL',
  'PRISMA_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
] as const;

export type DatabaseUrlSource =
  | 'none'
  | (typeof DATABASE_URL_ENV_KEYS)[number]
  | 'composed_from_pg_vars';

/** บอกว่า getDatabaseUrl() จะใช้คีย์ไหน (ไม่ส่งค่า) — ใช้ debug ที่ GET /api/health */
export function getDatabaseUrlSource(): DatabaseUrlSource {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const t = (process.env[key] || '').trim();
    if (t) return key;
  }
  if (buildDatabaseUrlFromPgEnv()) return 'composed_from_pg_vars';
  return 'none';
}
/** อ่านค่าแรกที่ไม่ว่างจาก process.env (รองรับชื่อ alias จาก Vercel / Neon / template) */
function firstEnvTrimmed(keys: readonly string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function buildDatabaseUrlFromPgEnv(): string | null {
  const host = firstEnvTrimmed(['PGHOST', 'POSTGRES_HOST', 'PG_HOST', 'DB_HOST']);
  const user = firstEnvTrimmed(['PGUSER', 'POSTGRES_USER', 'PG_USER', 'DB_USER']);
  const db = firstEnvTrimmed([
    'PGDATABASE',
    'POSTGRES_DATABASE',
    'POSTGRES_DB',
    'PG_DATABASE',
    'DB_NAME',
    'DATABASE_NAME',
  ]);
  if (!host || !user || !db) return null;
  const port = firstEnvTrimmed(['PGPORT', 'POSTGRES_PORT', 'PG_PORT', 'DB_PORT']) || '5432';
  const passStr = firstEnvTrimmed([
    'PGPASSWORD',
    'POSTGRES_PASSWORD',
    'PG_PASSWORD',
    'DB_PASSWORD',
  ]);
  const auth =
    passStr !== ''
      ? `${encodeURIComponent(user)}:${encodeURIComponent(passStr)}`
      : encodeURIComponent(user);
  return `postgresql://${auth}@${host}:${port}/${encodeURIComponent(db)}`;
}

export function getDatabaseUrl(): string | null {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const v = process.env[key];
    const t = (v || '').trim();
    if (t) return t;
  }
  const composed = buildDatabaseUrlFromPgEnv();
  return composed || null;
}

/** ใช้ใน error message — sync กับ scripts/database-url-from-env.mjs */
export const DATABASE_CONNECTION_ENV_HINT =
  'Set DATABASE_URL (or POSTGRES_URL / NEON_DATABASE_URL / …), or split vars: PGHOST+PGUSER+PGDATABASE (aliases: POSTGRES_HOST+POSTGRES_USER+POSTGRES_DB, DB_HOST+DB_USER+DB_NAME) + password keys PGPASSWORD / POSTGRES_PASSWORD / DB_PASSWORD + PGPORT / POSTGRES_PORT. Schema: PGSCHEMA or DATABASE_SCHEMA. Names are case-sensitive on Vercel. See .env.example.';

export function isPgSslEnabled(): boolean {
  const v = (process.env.PG_SSL || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * ค่าเริ่มต้น schema แอป — ต้องตรงกับ migrations/000_create_schema_car_stamp.sql
 * และ scripts/schema-constants.mjs (ใช้ตอน npm run db:migrate / db:seed)
 */
export const DEFAULT_PG_SCHEMA = 'car_stamp';

/**
 * Schema ใน PostgreSQL — ตั้ง search_path ทุกครั้งที่ได้ connection จาก pool
 * ใช้ PGSCHEMA หรือ DATABASE_SCHEMA; ถ้าไม่ตั้งใช้ car_stamp (ไม่แตะ jarvis_rm)
 */
export function getPgSchema(): string {
  const s = firstEnvTrimmed([
    'PGSCHEMA',
    'DATABASE_SCHEMA',
    'POSTGRES_SCHEMA',
    'DB_SCHEMA',
    'SCHEMA',
  ]);
  if (s && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) return s;
  return DEFAULT_PG_SCHEMA;
}

/** ชื่อตัวแปร DB ที่โปรเจกต์รู้จักและมีค่าไม่ว่างใน process.env (ไม่ส่งค่า — ใช้ debug ที่ GET /api/health) */
export function listNonEmptyDatabaseEnvKeyNames(): string[] {
  const out: string[] = [];
  for (const k of DB_ENV_KEYS) {
    const v = process.env[k];
    if (v !== undefined && String(v).trim() !== '') out.push(k);
  }
  return out;
}

/** true ถ้ามี host + user + database name ครบอย่างน้อยหนึ่งชื่อต่อกลุ่ม (ยังไม่รับรองว่าเชื่อมได้) */
export function canComposeDatabaseUrlParts(): boolean {
  return (
    !!firstEnvTrimmed(['PGHOST', 'POSTGRES_HOST', 'PG_HOST', 'DB_HOST']) &&
    !!firstEnvTrimmed(['PGUSER', 'POSTGRES_USER', 'PG_USER', 'DB_USER']) &&
    !!firstEnvTrimmed([
      'PGDATABASE',
      'POSTGRES_DATABASE',
      'POSTGRES_DB',
      'PG_DATABASE',
      'DB_NAME',
      'DATABASE_NAME',
    ])
  );
}
