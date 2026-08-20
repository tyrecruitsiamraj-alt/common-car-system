import { dbQuery } from '../_lib/postgres.js';
import { sendError, handleApiError, type ApiReq, type ApiRes } from '../_lib/http.js';
import { tableInAppSchema } from '../_lib/schema.js';

const tblE = tableInAppSchema('employees');

/**
 * รายชื่อพนักงานขับรถแบบ public — ใช้กับฟอร์มแจ้งเคสอุบัติเหตุ (ไม่ต้องล็อกอิน)
 * ส่งเฉพาะฟิลด์ที่จำเป็นสำหรับ select + auto-fill — ไม่ส่งเบอร์โทร/ที่อยู่/ข้อมูลการเงิน
 */

type Row = {
  id: string;
  employee_code: string;
  title_prefix: string | null;
  first_name: string;
  last_name: string;
  position: string | null;
  join_date: string | Date | null;
};

/** pg แปลงคอลัมน์ date เป็น Date แบบ local time — ต้องอ่านด้วย local getter ไม่ใช่ toISOString */
function toYmd(value: string | Date | null): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') return sendError(res, 405, 'Method not allowed');

  try {
    const { rows } = await dbQuery<Row>(
      `
      select id, employee_code, title_prefix, first_name, last_name, position, join_date
      from ${tblE}
      where status = 'active'
      order by first_name, last_name
      `,
    );
    return res.status(200).json(
      rows.map((r) => ({
        id: r.id,
        employee_code: r.employee_code,
        title_prefix: r.title_prefix ?? undefined,
        first_name: r.first_name,
        last_name: r.last_name,
        position: r.position ?? undefined,
        join_date: toYmd(r.join_date),
      })),
    );
  } catch (e) {
    return handleApiError(res, e, 'driver-directory GET');
  }
}

export default handler;
