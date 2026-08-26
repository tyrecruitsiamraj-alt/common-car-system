/**
 * เติมชื่อภาษาอังกฤษ (english_name) ให้พนักงานขับรถจาก data/employees.json
 * จับคู่ตรงตัวด้วย employee_code == "ID" ในไฟล์ (ทั้งสองฝั่งเป็นรูปแบบ "AD 001" ตรงกันอยู่แล้ว)
 * อัปเดตเมื่อ "Driver Name Eng" ในไฟล์ไม่ตรงกับ english_name ปัจจุบัน (รวมกรณียังว่างอยู่)
 *
 * ค่าเริ่มต้นเป็น dry-run (แสดงตัวอย่าง + สรุปจำนวน ไม่เขียนฐานข้อมูล)
 *   npm run db:sync:employee-english-name                     -- dry-run ไฟล์ default data/employees.json
 *   npm run db:sync:employee-english-name -- --apply           -- เขียนจริงลง DB
 *   npm run db:sync:employee-english-name -- --limit=10        -- อัปเดตจริงแค่ N แถวแรก (ใช้กับ --apply)
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

function normalizeSpaces(raw) {
  return String(raw ?? '').trim().normalize('NFC').replace(/\s+/g, ' ');
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
      `select id, employee_code, english_name from employees`,
    );
    const byCode = new Map(employees.map((e) => [normalizeSpaces(e.employee_code), e]));

    const toUpdate = [];
    const alreadyMatches = [];
    const notFound = [];
    const skippedBlank = [];

    for (const [i, row] of jsonRows.entries()) {
      const id = normalizeSpaces(row['ID']);
      const nameEng = normalizeSpaces(row['Driver Name Eng']);

      if (!id) {
        skippedBlank.push({ row: i + 1, reason: 'ID ว่าง' });
        continue;
      }
      if (!nameEng) {
        skippedBlank.push({ row: i + 1, id, reason: 'Driver Name Eng ว่าง' });
        continue;
      }

      const emp = byCode.get(id);
      if (!emp) {
        notFound.push({ id, nameEng });
        continue;
      }

      if (normalizeSpaces(emp.english_name) === nameEng) {
        alreadyMatches.push({ id, nameEng });
      } else {
        toUpdate.push({
          id,
          employee_id: emp.id,
          oldName: emp.english_name ?? '(ว่าง)',
          newName: nameEng,
        });
      }
    }

    console.log(`\nสรุปการจับคู่:`);
    console.log(`  ข้าม (ID/Driver Name Eng ว่าง): ${skippedBlank.length}`);
    console.log(`  ไม่พบ employee_code ที่ตรงกัน: ${notFound.length}`);
    console.log(`  ตรงกันอยู่แล้ว (ไม่ต้องแก้): ${alreadyMatches.length}`);
    console.log(`  จะอัปเดต english_name: ${toUpdate.length}`);

    if (notFound.length > 0) {
      console.log(`\nไม่พบ employee_code ที่ตรงกัน (${notFound.length}):`);
      for (const n of notFound) console.log(`  ${n.id} — ${n.nameEng}`);
    }
    if (toUpdate.length > 0) {
      console.log(`\nจะอัปเดต english_name (${toUpdate.length}):`);
      for (const u of toUpdate) {
        console.log(`  ${u.id}: "${u.oldName}" -> "${u.newName}"`);
      }
    }

    if (!apply) {
      console.log('\n[dry-run] ไม่ได้เขียนฐานข้อมูล — เพิ่ม --apply เพื่อบันทึกจริง');
      return;
    }

    const limited = limit ? toUpdate.slice(0, limit) : toUpdate;
    let updated = 0;
    for (const u of limited) {
      await client.query(`update employees set english_name = $1 where id = $2`, [u.newName, u.employee_id]);
      updated++;
    }
    console.log(`\nบันทึกสำเร็จ — อัปเดต english_name ${updated} คน${limit ? ` (จำกัดด้วย --limit=${limit})` : ''}`);
  } catch (e) {
    console.error('Sync failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
