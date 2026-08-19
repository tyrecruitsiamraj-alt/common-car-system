/**
 * ตรวจสอบรายชื่อพนักงานจาก data/employees.json กับตาราง employees ในฐานข้อมูล
 * โดยแยกชื่อจริง/นามสกุลจาก "Driver Name Th" ไปจับคู่กับ first_name/last_name ในตาราง
 * (ตัด title prefix ที่บางแถวติดมากับ first_name เช่น "นาย" ออกก่อนเทียบ)
 * ถ้าจับคู่ได้ 1 คนพอดี และ "Driver Type" ในไฟล์ไม่ตรงกับ position ปัจจุบัน — จะอัปเดต position ให้
 *
 * ค่าเริ่มต้นเป็น dry-run (แสดงตัวอย่าง + สรุปจำนวน ไม่เขียนฐานข้อมูล)
 *   npm run db:sync:employee-positions                     -- dry-run ไฟล์ default data/employees.json
 *   npm run db:sync:employee-positions -- --apply           -- เขียนจริงลง DB
 *   npm run db:sync:employee-positions -- "path/to/file.json" -- ระบุไฟล์อื่น
 *   npm run db:sync:employee-positions -- --limit=10        -- อัปเดตจริงแค่ N แถวแรก (ใช้กับ --apply)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { DEFAULT_PG_SCHEMA } from './schema-constants.mjs';
import { getDatabaseUrlFromEnv, DATABASE_URL_MISSING_HINT } from './database-url-from-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const DEFAULT_FILE = path.join(root, 'data', 'employees.json');

/** title prefix ที่รู้จัก — ต้องตรงกับ src/lib/titlePrefixOptions.ts TITLE_PREFIX_OPTIONS */
const TITLE_PREFIXES = ['นางสาว', 'เด็กชาย', 'เด็กหญิง', 'นาย', 'นาง'];

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
const filePath = args.find((a) => !a.startsWith('--')) || DEFAULT_FILE;

/** แยกชื่อเต็มไทย — คำแรก = ชื่อจริง ที่เหลือ = นามสกุล (เหมือน import-tdem-drivers.mjs) */
function splitFullName(raw) {
  const parts = String(raw ?? '').trim().normalize('NFC').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/** ตัด title prefix ที่ติดมากับ first_name ออก (ข้อมูลบางแถวใน DB ไม่ได้แยก title_prefix ไว้ต่างหาก) */
function stripTitlePrefix(rawFirstName) {
  const s = String(rawFirstName ?? '').trim().normalize('NFC');
  for (const p of TITLE_PREFIXES) {
    if (s.startsWith(p) && s.length > p.length) return s.slice(p.length);
  }
  return s;
}

function nameKey(first, last) {
  return `${first.trim().normalize('NFC')}|${last.trim().normalize('NFC')}`;
}

function readJsonRows() {
  if (!fs.existsSync(filePath)) {
    console.error(`ไม่พบไฟล์: ${filePath}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    console.error('ไฟล์ต้องเป็น JSON array ของแถวพนักงาน');
    process.exit(1);
  }
  return data;
}

async function main() {
  const jsonRows = readJsonRows();
  console.log(`ไฟล์: ${filePath}`);
  console.log(`แถวในไฟล์ทั้งหมด: ${jsonRows.length}`);

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
      `select id, employee_code, first_name, last_name, position from employees`,
    );

    /** @type {Map<string, typeof employees>} */
    const byName = new Map();
    for (const e of employees) {
      const key = nameKey(stripTitlePrefix(e.first_name), e.last_name);
      const list = byName.get(key) ?? [];
      list.push(e);
      byName.set(key, list);
    }
    const collisions = [...byName.entries()].filter(([, list]) => list.length > 1);

    const toUpdate = [];
    const alreadyMatches = [];
    const notFound = [];
    const ambiguous = [];
    const skippedBlank = [];

    for (const [i, row] of jsonRows.entries()) {
      const nameTh = String(row['Driver Name Th'] ?? '').trim();
      const driverType = String(row['Driver Type'] ?? '').trim();
      const id = String(row['ID'] ?? '').trim();

      if (!nameTh) {
        skippedBlank.push({ row: i + 1, id, reason: 'Driver Name Th ว่าง' });
        continue;
      }
      if (!driverType) {
        skippedBlank.push({ row: i + 1, id, reason: 'Driver Type ว่าง' });
        continue;
      }

      const { first, last } = splitFullName(nameTh);
      const key = nameKey(first, last);
      const matches = byName.get(key) ?? [];

      if (matches.length === 0) {
        notFound.push({ id, nameTh, driverType });
      } else if (matches.length > 1) {
        ambiguous.push({ id, nameTh, driverType, matches: matches.map((m) => m.employee_code) });
      } else {
        const emp = matches[0];
        if ((emp.position ?? '').trim() === driverType) {
          alreadyMatches.push({ id, nameTh, employee_code: emp.employee_code, position: driverType });
        } else {
          toUpdate.push({
            id,
            nameTh,
            employee_id: emp.id,
            employee_code: emp.employee_code,
            oldPosition: emp.position ?? '(ว่าง)',
            newPosition: driverType,
          });
        }
      }
    }

    console.log(`\nสรุปการจับคู่:`);
    console.log(`  ข้าม (ชื่อ/Driver Type ว่าง): ${skippedBlank.length}`);
    console.log(`  ไม่พบพนักงานที่ชื่อตรงกัน: ${notFound.length}`);
    console.log(`  จับคู่ได้มากกว่า 1 คน (ข้าม): ${ambiguous.length}`);
    console.log(`  ตรงกันอยู่แล้ว (ไม่ต้องแก้): ${alreadyMatches.length}`);
    console.log(`  จะอัปเดต position: ${toUpdate.length}`);
    if (collisions.length > 0) {
      console.log(
        `  [หมายเหตุ] พบชื่อ-นามสกุลซ้ำกันในตาราง employees ${collisions.length} คู่ (ไม่เกี่ยวกับไฟล์นี้ตรงๆ แต่ทำให้จับคู่บางชื่อกำกวมได้)`,
      );
    }

    if (notFound.length > 0) {
      console.log(`\nไม่พบพนักงานที่ชื่อตรงกัน (${notFound.length}):`);
      for (const n of notFound) console.log(`  ${n.id} — ${n.nameTh} (Driver Type: ${n.driverType})`);
    }
    if (ambiguous.length > 0) {
      console.log(`\nจับคู่ได้มากกว่า 1 คน — ข้ามไว้ก่อน (${ambiguous.length}):`);
      for (const a of ambiguous) console.log(`  ${a.id} — ${a.nameTh} -> ${a.matches.join(', ')}`);
    }
    if (toUpdate.length > 0) {
      console.log(`\nจะอัปเดต position (${toUpdate.length}):`);
      for (const u of toUpdate) {
        console.log(`  ${u.employee_code} (${u.nameTh}): "${u.oldPosition}" -> "${u.newPosition}"`);
      }
    }

    if (!apply) {
      console.log('\n[dry-run] ไม่ได้เขียนฐานข้อมูล — เพิ่ม --apply เพื่อบันทึกจริง');
      return;
    }

    const limited = limit ? toUpdate.slice(0, limit) : toUpdate;
    let updated = 0;
    for (const u of limited) {
      await client.query(`update employees set position = $1 where id = $2`, [u.newPosition, u.employee_id]);
      updated++;
    }
    console.log(`\nบันทึกสำเร็จ — อัปเดต position ${updated} คน${limit ? ` (จำกัดด้วย --limit=${limit})` : ''}`);
  } catch (e) {
    console.error('Sync failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
