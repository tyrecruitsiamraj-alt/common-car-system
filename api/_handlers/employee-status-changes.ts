import { dbQuery } from '../_lib/postgres.js';
import {
  withAuthStaffWrite,
  sendError,
  handleApiError,
  type ApiRes,
  type AuthedReq,
} from '../_lib/http.js';
import { readJsonBody, getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';

const tblEmp = tableInAppSchema('employees');
const tblHistory = tableInAppSchema('employee_status_history');

type ChangeType = 'resignation' | 'temp_replacement' | 'position_change';

const isChangeType = (v: unknown): v is ChangeType =>
  v === 'resignation' || v === 'temp_replacement' || v === 'position_change';

const isDateYmd = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type HistoryRow = {
  id: string;
  employee_id: string;
  change_type: ChangeType;
  old_status: string | null;
  new_status: string | null;
  old_position: string | null;
  new_position: string | null;
  old_boss_name: string | null;
  new_boss_name: string | null;
  effective_date: string | Date;
  note: string | null;
  created_at: string | Date;
};

function toYmd(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function toHistoryResponse(row: HistoryRow) {
  return {
    id: row.id,
    employee_id: row.employee_id,
    change_type: row.change_type,
    old_status: row.old_status || undefined,
    new_status: row.new_status || undefined,
    old_position: row.old_position || undefined,
    new_position: row.new_position || undefined,
    old_boss_name: row.old_boss_name || undefined,
    new_boss_name: row.new_boss_name || undefined,
    effective_date: toYmd(row.effective_date),
    note: row.note || undefined,
    created_at: toIsoString(row.created_at),
  };
}

/**
 * ตั้งเวลา/ยกเลิกการเปลี่ยนแปลงสถานะ-ตำแหน่งผู้ขับ (ลาออก / เปลี่ยนตัว / เปลี่ยนตำแหน่ง-เปลี่ยนนาย)
 * และดูประวัติที่เคย apply จริงแล้ว (employee_status_history)
 *
 * การ apply จริง (สลับ status/position/assigned_boss_name) เกิดแบบ lazy-on-read
 * ที่ `/api/employees` GET — ดู applyDueEmployeeChanges ใน employees.ts
 */
async function employeeStatusChangesHandler(req: AuthedReq, res: ApiRes) {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'GET') {
    try {
      const employeeId = getString(req.query?.employee_id);
      if (!employeeId) return sendError(res, 400, 'Bad request', 'employee_id is required');

      const { rows } = await dbQuery<HistoryRow>(
        `select * from ${tblHistory} where employee_id = $1 order by created_at desc`,
        [employeeId],
      );
      return res.status(200).json(rows.map(toHistoryResponse));
    } catch (e) {
      return handleApiError(res, e, 'employee-status-changes GET', { userId: req.user.sub });
    }
  }

  if (method === 'POST') {
    try {
      const raw = await readJsonBody(req);
      if (!isPlainObject(raw)) return sendError(res, 400, 'Bad request', 'Invalid JSON body');

      const employeeId = getString(raw.employee_id);
      if (!employeeId) return sendError(res, 400, 'Bad request', 'employee_id is required');

      if (!isChangeType(raw.change_type)) {
        return sendError(
          res,
          400,
          'Bad request',
          'change_type ต้องเป็น resignation, temp_replacement หรือ position_change',
        );
      }
      const changeType = raw.change_type;

      if (!isDateYmd(raw.effective_date)) {
        return sendError(res, 400, 'Bad request', 'effective_date ต้องเป็นรูปแบบ YYYY-MM-DD');
      }
      const effectiveDate = raw.effective_date;

      const newPosition = getString(raw.new_position);
      const newBossName = getString(raw.new_boss_name);
      const note = getString(raw.note);

      const pendingStatus = changeType === 'resignation' ? 'inactive' : null;
      const pendingPosition =
        changeType === 'temp_replacement'
          ? newPosition || 'Temp Driver'
          : changeType === 'position_change'
            ? newPosition
            : null;
      const pendingBossName = changeType === 'position_change' ? newBossName : null;

      if (changeType === 'position_change' && !pendingPosition && !pendingBossName) {
        return sendError(
          res,
          400,
          'Bad request',
          'ต้องระบุตำแหน่งใหม่ หรือ ชื่อนายใหม่ อย่างน้อยหนึ่งอย่าง',
        );
      }

      const { rows } = await dbQuery<{ id: string }>(
        `
          update ${tblEmp} set
            pending_status = $2,
            pending_position = $3,
            pending_boss_name = $4,
            pending_effective_date = $5::date,
            pending_change_type = $6,
            pending_note = $7
          where id = $1
          returning id
        `,
        [employeeId, pendingStatus, pendingPosition, pendingBossName, effectiveDate, changeType, note],
      );

      if (rows.length === 0) return sendError(res, 404, 'Not found', 'Employee not found');
      return res.status(200).json({ ok: true, id: rows[0].id });
    } catch (e) {
      return handleApiError(res, e, 'employee-status-changes POST', { userId: req.user.sub });
    }
  }

  if (method === 'DELETE') {
    try {
      const employeeId = getString(req.query?.employee_id);
      if (!employeeId) return sendError(res, 400, 'Bad request', 'employee_id is required');

      const { rows } = await dbQuery<{ id: string }>(
        `
          update ${tblEmp} set
            pending_status = null,
            pending_position = null,
            pending_boss_name = null,
            pending_effective_date = null,
            pending_change_type = null,
            pending_note = null
          where id = $1
          returning id
        `,
        [employeeId],
      );

      if (rows.length === 0) return sendError(res, 404, 'Not found', 'Employee not found');
      return res.status(200).json({ ok: true, id: rows[0].id });
    } catch (e) {
      return handleApiError(res, e, 'employee-status-changes DELETE', { userId: req.user.sub });
    }
  }

  return sendError(res, 405, 'Method not allowed');
}

export default withAuthStaffWrite(employeeStatusChangesHandler);
