import { dbQuery } from '../_lib/postgres.js';
import { withAuth, sendError, handleApiError, type ApiRes, type AuthedReq } from '../_lib/http.js';
import { readJsonBody, getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';
import { userHasCapability } from '../_lib/userPermissions.js';
import { ACCESS_WORK_HOURS_CAPABILITY } from '../_lib/workHours.js';

const tbl = tableInAppSchema('holidays');

type Row = {
  id: string;
  holiday_date: string | Date;
  name: string;
  holiday_type: 'official' | 'company';
};

const isDateYmd = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function toYmd(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function toEntry(row: Row) {
  return { id: row.id, holiday_date: toYmd(row.holiday_date), name: row.name, holiday_type: row.holiday_type };
}

/** วันหยุดราชการไทยที่กำหนดวันที่แน่นอนทุกปี (ไม่รวมวันหยุดตามจันทรคติ/วันหยุดชดเชยซึ่งต้องเพิ่มเอง) */
const FIXED_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'วันขึ้นปีใหม่' },
  { month: 4, day: 13, name: 'วันสงกรานต์' },
  { month: 4, day: 14, name: 'วันสงกรานต์' },
  { month: 4, day: 15, name: 'วันสงกรานต์' },
  { month: 5, day: 1, name: 'วันแรงงานแห่งชาติ' },
  { month: 5, day: 4, name: 'วันฉัตรมงคล' },
  { month: 7, day: 28, name: 'วันเฉลิมพระชนมพรรษา ร.10' },
  { month: 8, day: 12, name: 'วันแม่แห่งชาติ' },
  { month: 10, day: 13, name: 'วันคล้ายวันสวรรคต ร.9' },
  { month: 10, day: 23, name: 'วันปิยมหาราช' },
  { month: 12, day: 5, name: 'วันพ่อแห่งชาติ' },
  { month: 12, day: 10, name: 'วันรัฐธรรมนูญ' },
  { month: 12, day: 31, name: 'วันสิ้นปี' },
];

async function canAccess(req: AuthedReq): Promise<boolean> {
  return (
    req.user.role === 'admin' ||
    req.user.role === 'supervisor' ||
    (await userHasCapability(req.user.sub, ACCESS_WORK_HOURS_CAPABILITY))
  );
}

async function handler(req: AuthedReq, res: ApiRes) {
  const method = (req.method || 'GET').toUpperCase();

  if (!(await canAccess(req))) {
    return sendError(res, 403, 'Forbidden', 'ไม่มีสิทธิ์เข้าถึงข้อมูลชั่วโมงทำงาน');
  }

  if (method === 'GET') {
    try {
      const year = getString(req.query?.year);
      const params: unknown[] = [];
      let where = '';
      if (year && /^\d{4}$/.test(year)) {
        params.push(year);
        where = `where extract(year from holiday_date) = $1::int`;
      }
      const { rows } = await dbQuery<Row>(
        `select * from ${tbl} ${where} order by holiday_date asc`,
        params,
      );
      return res.status(200).json(rows.map(toEntry));
    } catch (e) {
      return handleApiError(res, e, 'holidays GET', { userId: req.user.sub });
    }
  }

  if (method === 'POST') {
    try {
      const raw = await readJsonBody(req);
      if (typeof raw !== 'object' || raw === null) {
        return sendError(res, 400, 'Bad request', 'Invalid JSON body');
      }
      const b = raw as Record<string, unknown>;

      // โหมดเติมวันหยุดมาตรฐานของปีที่ระบุให้อัตโนมัติ
      const seedYear = typeof b.seed_standard_year === 'number' ? Math.trunc(b.seed_standard_year) : null;
      if (seedYear) {
        const values = FIXED_HOLIDAYS.map(
          (h) => `('${seedYear}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}', '${h.name.replace(/'/g, "''")}', 'official')`,
        ).join(',\n');
        await dbQuery(
          `insert into ${tbl} (holiday_date, name, holiday_type) values ${values} on conflict (holiday_date) do nothing`,
          [],
        );
        const { rows } = await dbQuery<Row>(
          `select * from ${tbl} where extract(year from holiday_date) = $1::int order by holiday_date asc`,
          [seedYear],
        );
        return res.status(200).json(rows.map(toEntry));
      }

      const holiday_date = b.holiday_date;
      const name = getString(b.name);
      const holiday_type = b.holiday_type === 'company' ? 'company' : 'official';
      if (!isDateYmd(holiday_date) || !name) {
        return sendError(res, 400, 'Bad request', 'holiday_date (YYYY-MM-DD) and name required');
      }

      const { rows } = await dbQuery<Row>(
        `insert into ${tbl} (holiday_date, name, holiday_type)
         values ($1::date, $2, $3)
         on conflict (holiday_date) do update set name = excluded.name, holiday_type = excluded.holiday_type
         returning *`,
        [holiday_date, name, holiday_type],
      );
      const row = rows[0];
      if (!row) return sendError(res, 500, 'Failed to create holiday');
      return res.status(201).json(toEntry(row));
    } catch (e) {
      return handleApiError(res, e, 'holidays POST', { userId: req.user.sub });
    }
  }

  if (method === 'DELETE') {
    try {
      const id = getString(req.query?.id);
      if (!id) return sendError(res, 400, 'Bad request', 'id required');
      await dbQuery(`delete from ${tbl} where id = $1`, [id]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return handleApiError(res, e, 'holidays DELETE', { userId: req.user.sub });
    }
  }

  return sendError(res, 405, 'Method not allowed');
}

export default withAuth(handler);
