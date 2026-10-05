/**
 * จับคู่เคสร้องเรียน (complaints) และเคสอุบัติเหตุ (accident_cases) เข้ากับพนักงานในตาราง employees
 * ใช้แสดงในหน้าประวัติพนักงาน — ตารางทั้งสองไม่มี employee_id แบบ FK จริง (complaints.employee_id เป็น text
 * เก็บ employee_code แบบอิสระ, accident_cases ไม่มีคอลัมน์อ้างอิงพนักงานเลย) จึงต้องจับคู่ตอนอ่านข้อมูล:
 *   - complaints: จับคู่ด้วย employee_id (คือ employee_code) ก่อน แล้ว fallback เป็นชื่อ-สกุล
 *   - accident_cases: จับคู่ด้วยชื่อ-สกุลเท่านั้น (ไม่มีคอลัมน์รหัสพนักงาน)
 * ตรวจกับข้อมูลจริงแล้ว (2026-10): complaints จับคู่ได้ 30/34, accident_cases จับคู่ได้ 64/65
 * ที่เหลือจับไม่ได้เพราะเป็นคนที่ไม่มี/ไม่เหลือในตาราง employees แล้ว (เช่น ลาออกไปก่อนนำเข้าระบบ)
 */
import type { AccidentCase, Complaint, Employee } from '@/types';

const TITLE_PREFIXES_RE = /^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง)\s*/;

function normName(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFC')
    .trim()
    .replace(TITLE_PREFIXES_RE, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normCode(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

function employeeFullName(e: Employee): string {
  return `${e.first_name} ${e.last_name}`;
}

/** กรองเฉพาะเคสร้องเรียนของพนักงานคนนี้ — เทียบ employee_id (employee_code) ก่อน แล้ว fallback ชื่อ-สกุล */
export function complaintsForEmployee(complaints: Complaint[], employee: Employee): Complaint[] {
  const code = normCode(employee.employee_code);
  const name = normName(employeeFullName(employee));
  return complaints.filter((c) => {
    if (c.employee_id && normCode(c.employee_id) === code) return true;
    return normName(c.driver_name) === name;
  });
}

/** กรองเฉพาะเคสอุบัติเหตุของพนักงานคนนี้ — เทียบชื่อ-สกุลเท่านั้น (ตารางนี้ไม่มีรหัสพนักงาน) */
export function accidentsForEmployee(accidents: AccidentCase[], employee: Employee): AccidentCase[] {
  const name = normName(employeeFullName(employee));
  return accidents.filter((a) => normName(a.employee_name) === name);
}
