/**
 * นำเข้าคนขับจากไฟล์ TDEM Master File for BI (sheet "1 Driver Database") เข้าตาราง employees
 * Upsert ด้วย employee_code (คอลัมน์ "ID" ในไฟล์ เช่น "SR 0005", "DC 002") — คอลัมน์ที่ import:
 *   employee_code, first_name, last_name, phone, status, position, join_date
 * ชื่อ-สกุลใช้ "Driver Name Th" (แยกคำแรก = ชื่อ ที่เหลือ = นามสกุล) — fallback "Driver Name Eng" ถ้า Th ว่าง
 * (คอลัมน์อื่นในไฟล์ เช่น ข้อมูลรถ/ใบขับขี่/คะแนนประเมิน ยังไม่ import ในสคริปต์นี้)
 *
 * ค่าเริ่มต้นเป็น dry-run (แสดงตัวอย่าง + สรุปจำนวน ไม่เขียนฐานข้อมูล)
 *   npm run db:import:tdem-drivers                       -- dry-run ไฟล์ default ที่ root โปรเจกต์
 *   npm run db:import:tdem-drivers -- --apply             -- เขียนจริงลง DB
 *   npm run db:import:tdem-drivers -- "path/to/file.xlsx" -- ระบุไฟล์อื่น
 *   npm run db:import:tdem-drivers -- --limit=10          -- ทดสอบแค่ N แถวแรก
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import XLSX from 'xlsx';
import { DEFAULT_PG_SCHEMA } from './schema-constants.mjs';
import { getDatabaseUrlFromEnv, DATABASE_URL_MISSING_HINT } from './database-url-from-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SHEET_NAME = '1 Driver Database';
const DEFAULT_FILE = '(Template) TDEM Master File for BI.xlsx';

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

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const filePath = args.find((a) => !a.startsWith('--')) || path.join(root, DEFAULT_FILE);

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/** "5-Feb-2026" หรือ "01-Dec-23" -> "2026-02-05" (พ.ศ.2 หลักถือเป็น ค.ศ. 2000+YY) */
function parseStartDate(raw) {
  const s = String(raw ?? '').trim();
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/.exec(s);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${month}-${day}`;
}

function firstPhone(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  return s.split(/[,;/]/)[0].trim();
}

const STATUS_MAP = { onboard: 'active', resign: 'inactive' };

function mapStatus(raw) {
  const key = String(raw ?? '').trim().toLowerCase();
  return STATUS_MAP[key] ?? 'active';
}

/** แยกชื่อเต็ม (ไทยหรืออังกฤษ) เป็นชื่อ/นามสกุล — คำแรก = ชื่อ ที่เหลือ = นามสกุล */
function splitFullName(raw) {
  const parts = String(raw ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function readRows() {
  if (!fs.existsSync(filePath)) {
    console.error(`ไม่พบไฟล์: ${filePath}`);
    process.exit(1);
  }
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    console.error(`ไม่พบ sheet "${SHEET_NAME}" ในไฟล์ — sheet ที่มี: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
}

function mapDrivers(rows) {
  const header = rows[0];
  const idx = (name) => header.indexOf(name);
  const I = {
    id: idx('ID'),
    nameTh: idx('Driver Name Th'),
    engName: idx('Driver Name Eng'),
    tel: idx('Driver Tel.'),
    status: idx('Status'),
    start: idx('Start Date'),
    type: idx('Driver Type'),
  };
  for (const [key, i] of Object.entries(I)) {
    if (i < 0) throw new Error(`ไม่พบคอลัมน์ที่ต้องใช้ในไฟล์: ${key}`);
  }

  const drivers = [];
  const skipped = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawId = row[I.id] ? String(row[I.id]).trim().replace(/\s+/g, ' ') : '';
    if (!rawId || rawId.toLowerCase() === 'temp') {
      if (rawId) skipped.push({ row: r + 1, id: rawId, reason: 'placeholder row (Temp)' });
      continue;
    }

    let { first: first_name, last: last_name } = splitFullName(row[I.nameTh]);
    if (!first_name || !last_name) {
      const split = splitFullName(row[I.engName]);
      first_name = first_name || split.first;
      last_name = last_name || split.last;
    }

    const phone = firstPhone(row[I.tel]);
    const join_date = parseStartDate(row[I.start]);
    const status = mapStatus(row[I.status]);
    const position = row[I.type] ? String(row[I.type]).trim() : 'ผู้ขับ';

    const missing = [];
    if (!first_name) missing.push('first_name');
    if (!last_name) missing.push('last_name');
    if (!phone) missing.push('phone');
    if (!join_date) missing.push('join_date (Start Date รูปแบบไม่ตรง)');

    if (missing.length > 0) {
      skipped.push({ row: r + 1, id: rawId, reason: `missing: ${missing.join(', ')}` });
      continue;
    }

    drivers.push({
      employee_code: rawId,
      first_name,
      last_name,
      phone,
      status,
      position,
      join_date,
    });
  }

  return { drivers, skipped };
}

async function main() {
  const rows = readRows();
  const { drivers, skipped } = mapDrivers(rows);
  const limited = limit ? drivers.slice(0, limit) : drivers;

  console.log(`ไฟล์: ${filePath}`);
  console.log(`แถวข้อมูลทั้งหมด: ${rows.length - 1}`);
  console.log(`แมปสำเร็จ: ${drivers.length}  ข้าม: ${skipped.length}${limit ? `  (จำกัดรันจริง ${limited.length} แถวแรก)` : ''}`);
  if (skipped.length > 0) {
    console.log('ตัวอย่างแถวที่ข้าม:');
    for (const s of skipped.slice(0, 10)) console.log(`  แถว ${s.row} (${s.id}): ${s.reason}`);
    if (skipped.length > 10) console.log(`  ... และอีก ${skipped.length - 10} แถว`);
  }
  console.log('ตัวอย่างข้อมูลที่จะบันทึก (5 แถวแรก):');
  for (const d of limited.slice(0, 5)) console.log(' ', JSON.stringify(d));

  if (!apply) {
    console.log('\n[dry-run] ไม่ได้เขียนฐานข้อมูล — เพิ่ม --apply เพื่อบันทึกจริง');
    return;
  }

  const env = loadEnvFromFiles();
  const databaseUrl = getDatabaseUrlFromEnv(env).trim();
  if (!databaseUrl) {
    console.error(`Missing database connection. ${DATABASE_URL_MISSING_HINT}`);
    process.exit(1);
  }
  const pgSsl = ['true', '1', 'yes'].includes(String(env.PG_SSL || '').toLowerCase());
  const schema = String(
    env.PGSCHEMA || env.DATABASE_SCHEMA || env.POSTGRES_SCHEMA || env.DB_SCHEMA || env.SCHEMA || '',
  ).trim();
  const validSchema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) ? schema : DEFAULT_PG_SCHEMA;

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
    max: 1,
  });

  let inserted = 0;
  let updated = 0;
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${validSchema.replace(/"/g, '')}", public`);
      for (const d of limited) {
        const { rows: result } = await client.query(
          `
          insert into employees (employee_code, first_name, last_name, phone, status, position, join_date)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (employee_code) do update set
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            phone = excluded.phone,
            status = excluded.status,
            position = excluded.position,
            join_date = excluded.join_date
          returning (xmax = 0) as inserted
          `,
          [d.employee_code, d.first_name, d.last_name, d.phone, d.status, d.position, d.join_date],
        );
        if (result[0]?.inserted) inserted++;
        else updated++;
      }
      console.log(`\nบันทึกสำเร็จ — เพิ่มใหม่: ${inserted}  อัปเดต: ${updated}`);
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Import failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

await main();
