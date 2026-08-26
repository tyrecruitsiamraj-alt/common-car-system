/**
 * นำเข้าเรื่องร้องเรียนจาก data/complain.json เข้าตาราง complaints
 * ฟิลด์ที่เป็น select ในฟอร์ม (หมวดหมู่, ประเภทการร้องเรียน, ตำแหน่ง, สาเหตุที่แท้จริง, บทลงโทษ,
 * จำนวนครั้ง, การดำเนินการแก้ไข/ป้องกัน, สถานะพนักงาน, เหตุการณ์)
 * จะถูกเทียบกับตัวเลือกจริงใน src/lib/complaintOptions.ts ก่อนบันทึก
 * ค่าที่ไม่ตรงกับตัวเลือกใดเลยจะถูกรายงานเป็น "ไม่ตรง" (ยัง insert ด้วยค่าดิบ แต่ควรตรวจสอบ)
 *
 * กันข้อมูลซ้ำเบื้องต้น: ข้าม record ที่มี (complaint_date, driver_name) ตรงกับแถวที่มีอยู่แล้ว
 *
 * ค่าเริ่มต้นเป็น dry-run (แสดงตัวอย่าง + สรุปจำนวน ไม่เขียนฐานข้อมูล)
 *   npx tsx scripts/seed-complaints-from-json.ts                       -- dry-run ไฟล์ default data/complain.json
 *   npx tsx scripts/seed-complaints-from-json.ts -- --apply             -- เขียนจริงลง DB
 *   npx tsx scripts/seed-complaints-from-json.ts -- "path/to/file.json" -- ระบุไฟล์อื่น
 *   npx tsx scripts/seed-complaints-from-json.ts -- --limit=5           -- ทดสอบแค่ N แถวแรก
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { DEFAULT_PG_SCHEMA } from './schema-constants.mjs';
import { getDatabaseUrlFromEnv, DATABASE_URL_MISSING_HINT } from './database-url-from-env.mjs';
import {
  CASE_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  COMPLAINT_TYPE_OPTIONS,
  CORRECTIVE_ACTION_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS,
  OCCURRENCE_COUNT_OPTIONS,
  PENALTY_OPTIONS,
  POSITION_OPTIONS,
  ROOT_CAUSE_OPTIONS,
} from '../src/lib/complaintOptions';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const DEFAULT_FILE = path.join(root, 'data', 'complain.json');

function loadEnvFromFiles() {
  const merged: Record<string, string> = { ...(process.env as Record<string, string>) };
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

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const filePath = args.find((a) => !a.startsWith('--')) || DEFAULT_FILE;

/** typo/คำที่ใกล้เคียงในข้อมูลจริง -> ค่า option ที่ถูกต้อง (เทียบก่อน exact match) */
const CASE_TYPE_ALIASES: Record<string, string> = {
  'เหตุการ์ใหม่': 'เหตุการณ์ใหม่',
};

type SelectResolution = { value: string | null; matched: boolean; raw: string };

function resolveSelectValue(
  raw: unknown,
  options: readonly string[],
  aliases: Record<string, string> = {},
): SelectResolution {
  const s = String(raw ?? '').trim();
  if (!s) return { value: null, matched: true, raw: s };
  const aliased = aliases[s] ?? s;
  if (options.includes(aliased)) return { value: aliased, matched: true, raw: s };
  return { value: s, matched: false, raw: s };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "6-Jan-26" (d-MMM-yy ค.ศ. สองหลัก) -> "2026-01-06" */
function parseDMonYyDate(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/.exec(s);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  if (day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function readRows(): Record<string, unknown>[] {
  if (!fs.existsSync(filePath)) {
    console.error(`ไม่พบไฟล์: ${filePath}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!Array.isArray(data)) {
    console.error('ไฟล์ต้องเป็น JSON array ของแถวเรื่องร้องเรียน');
    process.exit(1);
  }
  return data as Record<string, unknown>[];
}

type MappedComplaint = {
  complaint_date: string;
  driver_name: string;
  customer_account: string | null;
  employee_id: string | null;
  years_of_service: string | null;
  employee_age: string | null;
  category: string | null;
  complaint_type: string | null;
  complaint_details: string | null;
  position: string | null;
  root_cause: string | null;
  penalty: string | null;
  occurrence_count: string | null;
  corrective_action: string | null;
  employee_status: string | null;
  case_type: string | null;
};

function optionalText(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return s || null;
}

function mapRows(rows: Record<string, unknown>[]) {
  const mapped: { row: number; data: MappedComplaint }[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const unmatched: { row: number; field: string; value: string }[] = [];

  rows.forEach((r, i) => {
    const rowNum = i + 1;
    const complaint_date = parseDMonYyDate(r['Complaint Date']);
    const driver_name = optionalText(r['Driver Name']);
    if (!complaint_date) {
      skipped.push({ row: rowNum, reason: `Complaint Date อ่านไม่ได้: ${JSON.stringify(r['Complaint Date'])}` });
      return;
    }
    if (!driver_name) {
      skipped.push({ row: rowNum, reason: 'Driver Name ว่าง' });
      return;
    }

    const category = resolveSelectValue(r['Category\nหมวดหมู่'], CATEGORY_OPTIONS);
    const complaintType = resolveSelectValue(
      r['Complaint Type / Sub-Type\nประเภท/ประเภทย่อยของการร้องเรียน'],
      COMPLAINT_TYPE_OPTIONS,
    );
    const position = resolveSelectValue(r['ตำแหน่ง'], POSITION_OPTIONS);
    const rootCause = resolveSelectValue(r['Root Cause\nสาเหตุที่แท้จริง'], ROOT_CAUSE_OPTIONS);
    const penalty = resolveSelectValue(r['บทลงโทษ'], PENALTY_OPTIONS);
    const occurrenceCount = resolveSelectValue(r['จำนวนครั้ง'], OCCURRENCE_COUNT_OPTIONS);
    const correctiveAction = resolveSelectValue(
      r['Corrective / Preventive Action\nการดำเนินการแก้ไข/ป้องกัน'],
      CORRECTIVE_ACTION_OPTIONS,
    );
    const employeeStatus = resolveSelectValue(r['สถานะพนักงาน'], EMPLOYEE_STATUS_OPTIONS);
    const caseType = resolveSelectValue(r['เหตุการณ์'], CASE_TYPE_OPTIONS, CASE_TYPE_ALIASES);

    for (const [field, res] of [
      ['category', category],
      ['complaint_type', complaintType],
      ['position', position],
      ['root_cause', rootCause],
      ['penalty', penalty],
      ['occurrence_count', occurrenceCount],
      ['corrective_action', correctiveAction],
      ['employee_status', employeeStatus],
      ['case_type', caseType],
    ] as [string, SelectResolution][]) {
      if (res.raw && !res.matched) unmatched.push({ row: rowNum, field, value: res.raw });
    }

    mapped.push({
      row: rowNum,
      data: {
        complaint_date,
        driver_name,
        customer_account: optionalText(r['Customer / Account']),
        employee_id: optionalText(r['Employee ID']),
        years_of_service: optionalText(r['อายุงาน']),
        employee_age: optionalText(r['อายุพนักงาน']),
        category: category.value,
        complaint_type: complaintType.value,
        complaint_details: optionalText(r['Complaint Details\nรายละเอียดการร้องเรียน']),
        position: position.value,
        root_cause: rootCause.value,
        penalty: penalty.value,
        occurrence_count: occurrenceCount.value,
        corrective_action: correctiveAction.value,
        employee_status: employeeStatus.value,
        case_type: caseType.value,
      },
    });
  });

  return { mapped, skipped, unmatched };
}

async function main() {
  const rows = readRows();
  const { mapped, skipped, unmatched } = mapRows(rows);
  const limited = limit ? mapped.slice(0, limit) : mapped;

  console.log(`ไฟล์: ${filePath}`);
  console.log(`แถวในไฟล์ทั้งหมด: ${rows.length}`);
  console.log(`แมปสำเร็จ: ${mapped.length}  ข้าม: ${skipped.length}${limit ? `  (จำกัดรันจริง ${limited.length} แถวแรก)` : ''}`);

  if (skipped.length > 0) {
    console.log('แถวที่ข้าม:');
    for (const s of skipped) console.log(`  แถว ${s.row}: ${s.reason}`);
  }
  if (unmatched.length > 0) {
    console.log(`\nค่าที่ไม่ตรงกับ select option ใดเลย (${unmatched.length}) — จะเก็บค่าดิบไว้ ควรตรวจสอบ:`);
    for (const u of unmatched) console.log(`  แถว ${u.row} — ${u.field}: "${u.value}"`);
  } else {
    console.log('\nทุกฟิลด์แบบ select จับคู่กับ option ที่มีอยู่ได้ครบ');
  }

  console.log('\nตัวอย่างข้อมูลที่จะบันทึก (3 แถวแรก):');
  for (const m of limited.slice(0, 3)) console.log(' ', JSON.stringify(m.data));

  if (!apply) {
    console.log('\n[dry-run] ไม่ได้เขียนฐานข้อมูล — เพิ่ม -- --apply เพื่อบันทึกจริง');
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
  let duplicateSkipped = 0;
  try {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO "${validSchema.replace(/"/g, '')}", public`);

      const { rows: existingRows } = await client.query(
        `select complaint_date::text as complaint_date, driver_name from complaints`,
      );
      const existingKeys = new Set(
        existingRows.map((r: { complaint_date: string; driver_name: string }) => `${r.complaint_date}|${r.driver_name}`),
      );

      for (const m of limited) {
        const key = `${m.data.complaint_date}|${m.data.driver_name}`;
        if (existingKeys.has(key)) {
          duplicateSkipped++;
          continue;
        }
        await client.query(
          `
          insert into complaints (
            complaint_date, driver_name, customer_account, employee_id, years_of_service,
            employee_age, category, complaint_type, complaint_details, position,
            root_cause, penalty, occurrence_count, corrective_action, employee_status, case_type
          )
          values (
            $1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
          `,
          [
            m.data.complaint_date,
            m.data.driver_name,
            m.data.customer_account,
            m.data.employee_id,
            m.data.years_of_service,
            m.data.employee_age,
            m.data.category,
            m.data.complaint_type,
            m.data.complaint_details,
            m.data.position,
            m.data.root_cause,
            m.data.penalty,
            m.data.occurrence_count,
            m.data.corrective_action,
            m.data.employee_status,
            m.data.case_type,
          ],
        );
        existingKeys.add(key);
        inserted++;
      }
      console.log(`\nบันทึกสำเร็จ — เพิ่มใหม่: ${inserted}  ข้าม (ซ้ำกับที่มีอยู่แล้ว): ${duplicateSkipped}`);
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Seed failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

await main();
