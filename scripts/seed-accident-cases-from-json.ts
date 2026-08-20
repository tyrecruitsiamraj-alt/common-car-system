/**
 * นำเข้าเคสอุบัติเหตุจาก data/cicase.json เข้าตาราง accident_cases
 * ฟิลด์ที่เป็น select ในฟอร์ม (ลักษณะงาน, สถานะเคส, รายละเอียดการเคลื่อนที่, ประเภทอุบัติเหตุ, รุ่นรถ, จังหวัด, วันทำงาน)
 * จะถูกเทียบกับตัวเลือกจริงใน src/lib/accidentCaseOptions.ts / thaiProvinces.ts ก่อนบันทึก
 * ค่าที่ไม่ตรงกับตัวเลือกใดเลยจะถูกรายงานเป็น "ไม่ตรง" (ยัง insert ด้วยค่าดิบ แต่ควรตรวจสอบ)
 *
 * กันข้อมูลซ้ำเบื้องต้น: ข้าม record ที่มี (case_date, employee_name) ตรงกับแถวที่มีอยู่แล้ว
 *
 * ค่าเริ่มต้นเป็น dry-run (แสดงตัวอย่าง + สรุปจำนวน ไม่เขียนฐานข้อมูล)
 *   npx tsx scripts/seed-accident-cases-from-json.ts                       -- dry-run ไฟล์ default data/cicase.json
 *   npx tsx scripts/seed-accident-cases-from-json.ts -- --apply             -- เขียนจริงลง DB
 *   npx tsx scripts/seed-accident-cases-from-json.ts -- "path/to/file.json" -- ระบุไฟล์อื่น
 *   npx tsx scripts/seed-accident-cases-from-json.ts -- --limit=5           -- ทดสอบแค่ N แถวแรก
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { DEFAULT_PG_SCHEMA } from './schema-constants.mjs';
import { getDatabaseUrlFromEnv, DATABASE_URL_MISSING_HINT } from './database-url-from-env.mjs';
import {
  JOB_TYPE_OPTIONS,
  CASE_STATUS_OPTIONS,
  MOVEMENT_DETAIL_OPTIONS,
  ACCIDENT_TYPE_OPTIONS,
  VEHICLE_MODEL_OPTIONS,
} from '../src/lib/accidentCaseOptions';
import { canonProvinceName } from '../src/lib/thaiProvinces';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const DEFAULT_FILE = path.join(root, 'data', 'cicase.json');
const WORK_DAY_TYPE_OPTIONS = ['วันทำงาน', 'วันหยุด'];

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
const ACCIDENT_TYPE_ALIASES: Record<string, string> = {
  'เบียดสิ่งไม่เคลือนที่': 'เบียดสิ่งไม่เคลื่อนที่',
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

/** "10/1/2026" (d/m/yyyy พ.ศ.หรือ ค.ศ.) -> "2026-01-10" */
function parseThaiSlashDate(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year > 2400) year -= 543; // พ.ศ. -> ค.ศ.
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function readRows(): Record<string, unknown>[] {
  if (!fs.existsSync(filePath)) {
    console.error(`ไม่พบไฟล์: ${filePath}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!Array.isArray(data)) {
    console.error('ไฟล์ต้องเป็น JSON array ของแถวเคส');
    process.exit(1);
  }
  return data as Record<string, unknown>[];
}

type MappedCase = {
  case_date: string;
  employee_name: string;
  driver_status: string | null;
  job_type: string | null;
  province: string | null;
  years_of_service: string | null;
  employee_age: string | null;
  case_status: string | null;
  time_range: string | null;
  work_day_type: string | null;
  vehicle_model: string | null;
  case_detail: string | null;
  accident_type: string | null;
  movement_detail: string | null;
  location_name: string | null;
  location_detail: string | null;
  root_cause: string | null;
  cause_detail: string | null;
  penalty: string | null;
};

function optionalText(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return s || null;
}

function mapRows(rows: Record<string, unknown>[]) {
  const mapped: { row: number; data: MappedCase }[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const unmatched: { row: number; field: string; value: string }[] = [];

  rows.forEach((r, i) => {
    const rowNum = i + 1;
    const case_date = parseThaiSlashDate(r['วันที่เกิดเคส']);
    const employee_name = optionalText(r['ชื่อ-นามสกุล']);
    if (!case_date) {
      skipped.push({ row: rowNum, reason: `วันที่เกิดเคสอ่านไม่ได้: ${JSON.stringify(r['วันที่เกิดเคส'])}` });
      return;
    }
    if (!employee_name) {
      skipped.push({ row: rowNum, reason: 'ชื่อ-นามสกุล ว่าง' });
      return;
    }

    const jobType = resolveSelectValue(r['ลักษณะงาน'], JOB_TYPE_OPTIONS);
    const caseStatus = resolveSelectValue(r['สถานะเคส'], CASE_STATUS_OPTIONS);
    const movementDetail = resolveSelectValue(r['รายละเอียดการเคลื่อนที่'], MOVEMENT_DETAIL_OPTIONS);
    const accidentType = resolveSelectValue(r['ประเภทอุบัติเหตุ'], ACCIDENT_TYPE_OPTIONS, ACCIDENT_TYPE_ALIASES);
    const vehicleModel = resolveSelectValue(r['รุ่นรถ'], VEHICLE_MODEL_OPTIONS);
    const workDayType = resolveSelectValue(r['วันทำงาน'], WORK_DAY_TYPE_OPTIONS);

    const rawProvince = optionalText(r['จังหวัดที่เกิด2']);
    const province = rawProvince ? canonProvinceName(rawProvince) : null;
    if (rawProvince && !province) {
      unmatched.push({ row: rowNum, field: 'province', value: rawProvince });
    }

    for (const [field, res] of [
      ['job_type', jobType],
      ['case_status', caseStatus],
      ['movement_detail', movementDetail],
      ['accident_type', accidentType],
      ['vehicle_model', vehicleModel],
      ['work_day_type', workDayType],
    ] as [string, SelectResolution][]) {
      if (res.raw && !res.matched) unmatched.push({ row: rowNum, field, value: res.raw });
    }

    mapped.push({
      row: rowNum,
      data: {
        case_date,
        employee_name,
        driver_status: optionalText(r['สถานะพนักงานขับรถ']),
        job_type: jobType.value,
        province: province ?? rawProvince,
        years_of_service: optionalText(r['อายุงาน']),
        employee_age: optionalText(r['อายุพนักงาน']),
        case_status: caseStatus.value,
        time_range: optionalText(r['ช่วงเวลาที่เกิดเหตุ']),
        work_day_type: workDayType.value,
        vehicle_model: vehicleModel.value,
        case_detail: optionalText(r['รายละเอียดเคส']),
        accident_type: accidentType.value,
        movement_detail: movementDetail.value,
        location_name: optionalText(r['สถานที่เกิดอุบัติเหตุ']),
        location_detail: optionalText(r['รายละเอียดจุดเกิดเหตุ']),
        root_cause: optionalText(r['ต้นเหตุของการเกิดเคส']),
        cause_detail: optionalText(r['รายละเอียดการเกิดเคส']),
        penalty: optionalText(r['บทลงโทษ']),
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
        `select case_date::text as case_date, employee_name from accident_cases`,
      );
      const existingKeys = new Set(
        existingRows.map((r: { case_date: string; employee_name: string }) => `${r.case_date}|${r.employee_name}`),
      );

      for (const m of limited) {
        const key = `${m.data.case_date}|${m.data.employee_name}`;
        if (existingKeys.has(key)) {
          duplicateSkipped++;
          continue;
        }
        await client.query(
          `
          insert into accident_cases (
            case_date, employee_name, driver_status, job_type, province, years_of_service,
            employee_age, case_status, time_range, work_day_type, vehicle_model, case_detail,
            accident_type, movement_detail, location_name, location_detail, root_cause,
            cause_detail, penalty
          )
          values (
            $1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          )
          `,
          [
            m.data.case_date,
            m.data.employee_name,
            m.data.driver_status,
            m.data.job_type,
            m.data.province,
            m.data.years_of_service,
            m.data.employee_age,
            m.data.case_status,
            m.data.time_range,
            m.data.work_day_type,
            m.data.vehicle_model,
            m.data.case_detail,
            m.data.accident_type,
            m.data.movement_detail,
            m.data.location_name,
            m.data.location_detail,
            m.data.root_cause,
            m.data.cause_detail,
            m.data.penalty,
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
