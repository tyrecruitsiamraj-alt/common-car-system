/**
 * นำเข้าข้อมูลเสริมคนขับจากไฟล์ "Database TMA.xlsx" (sheet แรก) เข้าตาราง driver_tma_profiles
 * จับคู่กับพนักงานในตาราง employees "โดยยึดชื่อ-สกุลเป็นหลัก" (Driver Name Th เทียบกับ first_name+last_name
 * แบบ normalize ช่องว่าง/ตัวพิมพ์) — ถ้าชื่อซ้ำกันมากกว่า 1 คน จะใช้คอลัมน์ "ID" เทียบกับ employee_code
 * เพื่อเลือกคนที่ถูกต้อง (ทุกกรณีชื่อซ้ำในไฟล์นี้มี ID ตรงกับ employee_code ช่วยแยกได้)
 * ถ้าไม่พบพนักงานที่ชื่อตรงเลย จะสร้างพนักงานใหม่ (เหมือน import-tdem-drivers.mjs) แล้วค่อยผูกโปรไฟล์
 *
 * ไม่แก้ไข/ลบข้อมูลเดิมของ employees ที่มีอยู่แล้ว — เพิ่มแถวใหม่ในตาราง driver_tma_profiles เท่านั้น
 * (upsert ด้วย employee_id: ถ้ามีโปรไฟล์อยู่แล้วจะอัปเดตเฉพาะข้อมูลในตารางนี้ ไม่แตะ employees)
 *
 * ค่าเริ่มต้นเป็น dry-run (แสดงตัวอย่าง + สรุปจำนวน ไม่เขียนฐานข้อมูล)
 *   npm run db:import:tma-driver-profiles                       -- dry-run ไฟล์ default ที่ root โปรเจกต์
 *   npm run db:import:tma-driver-profiles -- --apply             -- เขียนจริงลง DB
 *   npm run db:import:tma-driver-profiles -- "path/to/file.xlsx" -- ระบุไฟล์อื่น
 *   npm run db:import:tma-driver-profiles -- --limit=10          -- ทดสอบแค่ N แถวแรก (ใช้กับ --apply)
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

const DEFAULT_FILE = 'Database TMA.xlsx';

// ตำแหน่งคอลัมน์คงที่ในไฟล์ (ยืนยันด้วยการตรวจ header จริงก่อนรัน — ดู assertHeader)
const COL = {
  id: 0,
  nameEng: 1,
  nameTh: 2,
  tel: 3,
  lineId: 4,
  site: 5,
  subSite: 6,
  status: 7,
  startDate: 8,
  endDate: 9,
  resignReason: 10,
  experience: 11,
  driverType: 12,
  underDriverCo: 13,
  bossType: 14,
  userName: 15,
  userTel: 16,
  apartment: 17,
  carModel: 18,
  carColor: 19,
  carNo: 20,
  carSticker: 21,
  driverMovement: 22,
  driverPictureUrl: 23,
  driverLicenseImageUrl: 24, // หัวคอลัมน์ในไฟล์เขียนว่า "Driver License Expire" แต่ค่าจริงเป็นลิงก์รูปใบขับขี่
  carMovement: 25,
  defensiveSafetyDriving: 26,
  tdemCardId: 27,
  cardLast5: 28,
  birthdate: 29,
  age: 30,
  engFirstName: 31,
  engLastName: 32,
  examScore2025: 33,
  supervisorScore2025: 34,
  complainScore: 35,
  accidentScore: 36,
  totalScore: 37,
};

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

/** "5-Feb-26" หรือ "01-Dec-2023" -> "2026-02-05" (พ.ศ.2 หลักถือเป็น ค.ศ. 2000+YY) */
function parseExcelDate(raw) {
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

function mapEmployeeStatus(raw) {
  const key = String(raw ?? '').trim().toLowerCase();
  return STATUS_MAP[key] ?? 'active';
}

/** แยกชื่อเต็ม (ไทยหรืออังกฤษ) เป็นชื่อ/นามสกุล — คำแรก = ชื่อ ที่เหลือ = นามสกุล (เหมือน import-tdem-drivers.mjs) */
function splitFullName(raw) {
  const parts = String(raw ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function normName(s) {
  return String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normCode(s) {
  return String(s ?? '').normalize('NFC').trim().replace(/\s+/g, '').toUpperCase();
}

function cell(raw) {
  const s = String(raw ?? '').trim();
  return s === '' ? null : s;
}

function numOrNull(raw) {
  const s = String(raw ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function readRows() {
  if (!fs.existsSync(filePath)) {
    console.error(`ไม่พบไฟล์: ${filePath}`);
    process.exit(1);
  }
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
}

/** ยืนยันว่า header ของไฟล์ยังตรงกับตำแหน่งคอลัมน์คงที่ที่โค้ดสมมติไว้ — กันไฟล์เปลี่ยนโครงสร้างแล้ว import ผิดคอลัมน์ */
function assertHeader(header) {
  const expect = {
    [COL.id]: 'id',
    [COL.nameEng]: 'driver name eng',
    [COL.nameTh]: 'driver name th',
    [COL.tel]: 'driver tel.',
    [COL.status]: 'status',
    [COL.startDate]: 'start date',
  };
  const problems = [];
  for (const [i, expected] of Object.entries(expect)) {
    const actual = String(header[Number(i)] ?? '').trim().toLowerCase();
    if (actual !== expected) {
      problems.push(`คอลัมน์ที่ ${i}: คาดว่า "${expected}" แต่พบ "${header[Number(i)]}"`);
    }
  }
  if (problems.length > 0) {
    console.error('โครงสร้างไฟล์ไม่ตรงกับที่คาดไว้ (อาจมีการเพิ่ม/ลบคอลัมน์) — หยุดเพื่อความปลอดภัย:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }
}

function mapRow(row) {
  return {
    tma_driver_code: cell(row[COL.id]),
    driver_name_eng: cell(row[COL.nameEng]),
    driver_name_th: cell(row[COL.nameTh]),
    driver_tel: cell(row[COL.tel]),
    line_id: cell(row[COL.lineId]),
    site: cell(row[COL.site]),
    sub_site: cell(row[COL.subSite]),
    tma_status: cell(row[COL.status]),
    start_date: parseExcelDate(row[COL.startDate]),
    end_date: parseExcelDate(row[COL.endDate]),
    resignation_reason: cell(row[COL.resignReason]),
    experience_years: numOrNull(row[COL.experience]),
    driver_type: cell(row[COL.driverType]),
    under_driver_co: cell(row[COL.underDriverCo]),
    boss_type: cell(row[COL.bossType]),
    assigned_user_name: cell(row[COL.userName]),
    assigned_user_tel: cell(row[COL.userTel]),
    apartment: cell(row[COL.apartment]),
    car_model: cell(row[COL.carModel]),
    car_color: cell(row[COL.carColor]),
    car_no: cell(row[COL.carNo]),
    car_sticker: cell(row[COL.carSticker]),
    driver_movement: cell(row[COL.driverMovement]),
    car_movement: cell(row[COL.carMovement]),
    driver_picture_url: cell(row[COL.driverPictureUrl]),
    driver_license_image_url: cell(row[COL.driverLicenseImageUrl]),
    defensive_safety_driving: cell(row[COL.defensiveSafetyDriving]),
    tdem_card_id: cell(row[COL.tdemCardId]),
    card_last5: cell(row[COL.cardLast5]),
    birthdate: parseExcelDate(row[COL.birthdate]),
    age: numOrNull(row[COL.age]),
    english_first_name: cell(row[COL.engFirstName]),
    english_last_name: cell(row[COL.engLastName]),
    exam_score_2025: numOrNull(row[COL.examScore2025]),
    supervisor_score_2025: numOrNull(row[COL.supervisorScore2025]),
    complain_score: numOrNull(row[COL.complainScore]),
    accident_score: numOrNull(row[COL.accidentScore]),
    total_score: numOrNull(row[COL.totalScore]),
  };
}

async function main() {
  const rows = readRows();
  const header = rows[0];
  assertHeader(header);
  const dataRows = rows.slice(1).filter((r) => cell(r[COL.id]) || cell(r[COL.nameTh]));

  console.log(`ไฟล์: ${filePath}`);
  console.log(`แถวข้อมูลทั้งหมด: ${dataRows.length}`);

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

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${validSchema.replace(/"/g, '')}", public`);

    const { rows: employees } = await client.query(
      'select id, employee_code, first_name, last_name from employees',
    );
    const byName = new Map();
    for (const e of employees) {
      const key = normName(`${e.first_name} ${e.last_name}`);
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(e);
    }

    const plan = []; // { action: 'link' | 'create', employee, profile, tmaCode, nameTh }
    const ambiguous = [];
    const skippedNoData = [];

    for (const row of dataRows) {
      const profile = mapRow(row);
      const nameTh = profile.driver_name_th;
      if (!nameTh) {
        skippedNoData.push({ tmaCode: profile.tma_driver_code, reason: 'ไม่มีชื่อ (Driver Name Th ว่าง)' });
        continue;
      }
      const key = normName(nameTh);
      const candidates = byName.get(key) || [];

      let employee = null;
      if (candidates.length === 1) {
        employee = candidates[0];
      } else if (candidates.length > 1) {
        employee = candidates.find((c) => normCode(c.employee_code) === normCode(profile.tma_driver_code)) || null;
        if (!employee) {
          ambiguous.push({ tmaCode: profile.tma_driver_code, nameTh, candidates: candidates.map((c) => c.employee_code) });
          continue;
        }
      }

      if (employee) {
        plan.push({ action: 'link', employee, profile, tmaCode: profile.tma_driver_code, nameTh });
        continue;
      }

      // ไม่พบพนักงานที่ชื่อตรงเลย — เตรียมสร้างพนักงานใหม่ (เหมือน import-tdem-drivers.mjs)
      let { first: first_name, last: last_name } = splitFullName(nameTh);
      if (!first_name || !last_name) {
        const split = splitFullName(profile.driver_name_eng);
        first_name = first_name || split.first;
        last_name = last_name || split.last;
      }
      const phone = firstPhone(profile.driver_tel);
      const join_date = profile.start_date;
      const newEmployeeCode = profile.tma_driver_code;

      const missing = [];
      if (!newEmployeeCode) missing.push('employee_code (ID ว่าง)');
      if (!first_name) missing.push('first_name');
      if (!last_name) missing.push('last_name');
      if (!phone) missing.push('phone');
      if (!join_date) missing.push('join_date (Start Date รูปแบบไม่ตรง)');
      if (missing.length > 0) {
        skippedNoData.push({ tmaCode: profile.tma_driver_code, nameTh, reason: `ไม่พบพนักงานเดิมและสร้างใหม่ไม่ได้ — missing: ${missing.join(', ')}` });
        continue;
      }

      plan.push({
        action: 'create',
        newEmployee: {
          employee_code: newEmployeeCode,
          first_name,
          last_name,
          phone,
          status: mapEmployeeStatus(profile.tma_status),
          position: profile.driver_type || 'ผู้ขับ',
          join_date,
        },
        profile,
        tmaCode: profile.tma_driver_code,
        nameTh,
      });
    }

    const toLink = plan.filter((p) => p.action === 'link');
    const toCreate = plan.filter((p) => p.action === 'create');

    console.log(`\nสรุปการจับคู่ (จับคู่ด้วยชื่อ-สกุลเป็นหลัก):`);
    console.log(`  จับคู่กับพนักงานเดิมได้: ${toLink.length}`);
    console.log(`  ไม่พบพนักงานเดิม -> จะสร้างใหม่: ${toCreate.length}`);
    console.log(`  ชื่อซ้ำกันหลายคนและ ID ไม่ตรงใครเลย (ข้าม): ${ambiguous.length}`);
    console.log(`  ข้าม (ข้อมูลไม่พอ): ${skippedNoData.length}`);

    if (toCreate.length > 0) {
      console.log(`\nพนักงานใหม่ที่จะสร้าง (${toCreate.length}):`);
      for (const p of toCreate) console.log('  ', JSON.stringify(p.newEmployee));
    }
    if (ambiguous.length > 0) {
      console.log(`\nชื่อซ้ำที่ข้าม (${ambiguous.length}):`);
      for (const a of ambiguous) console.log(`  ${a.tmaCode} ${a.nameTh} -> candidates: ${a.candidates.join(', ')}`);
    }
    if (skippedNoData.length > 0) {
      console.log(`\nแถวที่ข้าม (${skippedNoData.length}):`);
      for (const s of skippedNoData.slice(0, 20)) console.log(`  ${s.tmaCode ?? '(no id)'} ${s.nameTh ?? ''}: ${s.reason}`);
      if (skippedNoData.length > 20) console.log(`  ... และอีก ${skippedNoData.length - 20} แถว`);
    }

    if (!apply) {
      console.log('\n[dry-run] ไม่ได้เขียนฐานข้อมูล — เพิ่ม --apply เพื่อบันทึกจริง');
      return;
    }

    const limited = limit ? plan.slice(0, limit) : plan;
    let createdEmployees = 0;
    let insertedProfiles = 0;
    let updatedProfiles = 0;

    for (const p of limited) {
      let employeeId;
      if (p.action === 'create') {
        const { rows: created } = await client.query(
          `
          insert into employees (employee_code, first_name, last_name, phone, status, position, join_date)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (employee_code) do nothing
          returning id
          `,
          [
            p.newEmployee.employee_code,
            p.newEmployee.first_name,
            p.newEmployee.last_name,
            p.newEmployee.phone,
            p.newEmployee.status,
            p.newEmployee.position,
            p.newEmployee.join_date,
          ],
        );
        if (created.length === 0) {
          // employee_code ชนกันพอดี (race หรือรันซ้ำ) — ลองค้นหาแทน
          const { rows: existing } = await client.query(
            'select id from employees where employee_code = $1 limit 1',
            [p.newEmployee.employee_code],
          );
          if (existing.length === 0) {
            console.error(`ข้าม ${p.tmaCode}: สร้างพนักงานใหม่ไม่สำเร็จ`);
            continue;
          }
          employeeId = existing[0].id;
        } else {
          employeeId = created[0].id;
          createdEmployees++;
        }
      } else {
        employeeId = p.employee.id;
      }

      const pr = p.profile;
      const { rows: upserted } = await client.query(
        `
        insert into driver_tma_profiles (
          employee_id, tma_driver_code, driver_name_eng, driver_name_th,
          driver_tel, line_id, site, sub_site, tma_status,
          start_date, end_date, resignation_reason, experience_years,
          driver_type, under_driver_co, boss_type, assigned_user_name, assigned_user_tel, apartment,
          car_model, car_color, car_no, car_sticker, driver_movement, car_movement,
          driver_picture_url, driver_license_image_url,
          defensive_safety_driving, tdem_card_id, card_last5,
          birthdate, age, english_first_name, english_last_name,
          exam_score_2025, supervisor_score_2025, complain_score, accident_score, total_score,
          imported_at, updated_at
        )
        values (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25,
          $26, $27,
          $28, $29, $30,
          $31, $32, $33, $34,
          $35, $36, $37, $38, $39,
          now(), now()
        )
        on conflict (employee_id) where employee_id is not null do update set
          tma_driver_code = excluded.tma_driver_code,
          driver_name_eng = excluded.driver_name_eng,
          driver_name_th = excluded.driver_name_th,
          driver_tel = excluded.driver_tel,
          line_id = excluded.line_id,
          site = excluded.site,
          sub_site = excluded.sub_site,
          tma_status = excluded.tma_status,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          resignation_reason = excluded.resignation_reason,
          experience_years = excluded.experience_years,
          driver_type = excluded.driver_type,
          under_driver_co = excluded.under_driver_co,
          boss_type = excluded.boss_type,
          assigned_user_name = excluded.assigned_user_name,
          assigned_user_tel = excluded.assigned_user_tel,
          apartment = excluded.apartment,
          car_model = excluded.car_model,
          car_color = excluded.car_color,
          car_no = excluded.car_no,
          car_sticker = excluded.car_sticker,
          driver_movement = excluded.driver_movement,
          car_movement = excluded.car_movement,
          driver_picture_url = excluded.driver_picture_url,
          driver_license_image_url = excluded.driver_license_image_url,
          defensive_safety_driving = excluded.defensive_safety_driving,
          tdem_card_id = excluded.tdem_card_id,
          card_last5 = excluded.card_last5,
          birthdate = excluded.birthdate,
          age = excluded.age,
          english_first_name = excluded.english_first_name,
          english_last_name = excluded.english_last_name,
          exam_score_2025 = excluded.exam_score_2025,
          supervisor_score_2025 = excluded.supervisor_score_2025,
          complain_score = excluded.complain_score,
          accident_score = excluded.accident_score,
          total_score = excluded.total_score,
          imported_at = now(),
          updated_at = now()
        returning (xmax = 0) as inserted
        `,
        [
          employeeId, pr.tma_driver_code, pr.driver_name_eng, pr.driver_name_th,
          pr.driver_tel, pr.line_id, pr.site, pr.sub_site, pr.tma_status,
          pr.start_date, pr.end_date, pr.resignation_reason, pr.experience_years,
          pr.driver_type, pr.under_driver_co, pr.boss_type, pr.assigned_user_name, pr.assigned_user_tel, pr.apartment,
          pr.car_model, pr.car_color, pr.car_no, pr.car_sticker, pr.driver_movement, pr.car_movement,
          pr.driver_picture_url, pr.driver_license_image_url,
          pr.defensive_safety_driving, pr.tdem_card_id, pr.card_last5,
          pr.birthdate, pr.age, pr.english_first_name, pr.english_last_name,
          pr.exam_score_2025, pr.supervisor_score_2025, pr.complain_score, pr.accident_score, pr.total_score,
        ],
      );
      if (upserted[0]?.inserted) insertedProfiles++;
      else updatedProfiles++;
    }

    console.log(
      `\nบันทึกสำเร็จ — พนักงานใหม่: ${createdEmployees}  โปรไฟล์เพิ่มใหม่: ${insertedProfiles}  โปรไฟล์อัปเดต: ${updatedProfiles}${
        limit ? `  (จำกัดด้วย --limit=${limit})` : ''
      }`,
    );
  } catch (e) {
    console.error('Import failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
