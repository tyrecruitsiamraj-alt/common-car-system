import { dbQuery } from '../_lib/postgres.js';
import { withAuth, sendError, handleApiError, type ApiRes, type AuthedReq } from '../_lib/http.js';
import { readJsonBody } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';
import { userHasCapability } from '../_lib/userPermissions.js';
import { ACCESS_WORK_HOURS_CAPABILITY } from '../_lib/workHours.js';

const tbl = tableInAppSchema('ot_settings');

type Row = {
  ot_rate_1_5x: string | number;
  ot_rate_3x: string | number;
  full_time_threshold_hours: string | number;
  supervisor_ot_alert_hours: string | number;
  updated_at: string | Date;
};

function toEntry(row: Row) {
  return {
    ot_rate_1_5x: Number(row.ot_rate_1_5x),
    ot_rate_3x: Number(row.ot_rate_3x),
    full_time_threshold_hours: Number(row.full_time_threshold_hours),
    supervisor_ot_alert_hours: Number(row.supervisor_ot_alert_hours),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

async function canAccess(req: AuthedReq): Promise<boolean> {
  return (
    req.user.role === 'admin' ||
    req.user.role === 'supervisor' ||
    (await userHasCapability(req.user.sub, ACCESS_WORK_HOURS_CAPABILITY))
  );
}

const toPositiveNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

async function handler(req: AuthedReq, res: ApiRes) {
  const method = (req.method || 'GET').toUpperCase();

  if (!(await canAccess(req))) {
    return sendError(res, 403, 'Forbidden', 'ไม่มีสิทธิ์เข้าถึงข้อมูลชั่วโมงทำงาน');
  }

  if (method === 'GET') {
    try {
      const { rows } = await dbQuery<Row>(`select * from ${tbl} where id = true limit 1`, []);
      const row = rows[0];
      if (!row) return sendError(res, 404, 'Not found', 'ยังไม่ได้ตั้งค่า');
      return res.status(200).json(toEntry(row));
    } catch (e) {
      return handleApiError(res, e, 'ot-settings GET', { userId: req.user.sub });
    }
  }

  if (method === 'PATCH' || method === 'PUT') {
    try {
      const raw = await readJsonBody(req);
      if (typeof raw !== 'object' || raw === null) {
        return sendError(res, 400, 'Bad request', 'Invalid JSON body');
      }
      const b = raw as Record<string, unknown>;

      const { rows: curRows } = await dbQuery<Row>(`select * from ${tbl} where id = true limit 1`, []);
      const cur = curRows[0];
      if (!cur) return sendError(res, 404, 'Not found', 'ยังไม่ได้ตั้งค่า');

      const next = {
        ot_rate_1_5x: b.ot_rate_1_5x !== undefined ? toPositiveNumber(b.ot_rate_1_5x) ?? Number(cur.ot_rate_1_5x) : Number(cur.ot_rate_1_5x),
        ot_rate_3x: b.ot_rate_3x !== undefined ? toPositiveNumber(b.ot_rate_3x) ?? Number(cur.ot_rate_3x) : Number(cur.ot_rate_3x),
        full_time_threshold_hours:
          b.full_time_threshold_hours !== undefined
            ? toPositiveNumber(b.full_time_threshold_hours) ?? Number(cur.full_time_threshold_hours)
            : Number(cur.full_time_threshold_hours),
        supervisor_ot_alert_hours:
          b.supervisor_ot_alert_hours !== undefined
            ? toPositiveNumber(b.supervisor_ot_alert_hours) ?? Number(cur.supervisor_ot_alert_hours)
            : Number(cur.supervisor_ot_alert_hours),
      };

      const { rows } = await dbQuery<Row>(
        `update ${tbl} set
          ot_rate_1_5x = $1,
          ot_rate_3x = $2,
          full_time_threshold_hours = $3,
          supervisor_ot_alert_hours = $4,
          updated_at = now(),
          updated_by_user_id = $5
        where id = true
        returning *`,
        [next.ot_rate_1_5x, next.ot_rate_3x, next.full_time_threshold_hours, next.supervisor_ot_alert_hours, req.user.sub],
      );
      const row = rows[0];
      if (!row) return sendError(res, 500, 'Failed to update');
      return res.status(200).json(toEntry(row));
    } catch (e) {
      return handleApiError(res, e, 'ot-settings PATCH', { userId: req.user.sub });
    }
  }

  return sendError(res, 405, 'Method not allowed');
}

export default withAuth(handler);
