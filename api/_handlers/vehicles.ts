import { dbQuery } from '../_lib/postgres.js';
import {
  withAuthStaffCreateSupervisorMutate,
  sendError,
  handleApiError,
  type ApiRes,
  type AuthedReq,
} from '../_lib/http.js';
import { readJsonBody, getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';

const tbl = tableInAppSchema('vehicles');

type Row = {
  id: string;
  plate_no: string;
  label: string;
  seats: number;
  is_active: boolean;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function toVehicle(row: Row) {
  return {
    id: row.id,
    plate_no: row.plate_no,
    label: row.label || undefined,
    seats: row.seats,
    is_active: row.is_active,
    notes: row.notes || undefined,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

const parseIntOrNull = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

async function handler(req: AuthedReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'GET') {
    try {
      const activeOnly = ['1', 'true', 'yes'].includes(
        String(req.query?.active_only ?? '').toLowerCase().trim(),
      );
      const where = activeOnly ? 'where is_active = true' : '';
      const { rows } = await dbQuery<Row>(`select * from ${tbl} ${where} order by plate_no asc`);
      return res.status(200).json(rows.map(toVehicle));
    } catch (e) {
      return handleApiError(res, e, 'vehicles GET', { userId: req.user.sub });
    }
  }

  if (method === 'POST') {
    try {
      const raw = await readJsonBody(req);
      if (typeof raw !== 'object' || raw === null) {
        return sendError(
          res,
          400,
          'Bad request',
          'ไม่ได้รับข้อมูลรถ (JSON) — ลองรีเฟรชหน้า หรือล็อกอินใหม่แล้วบันทึกอีกครั้ง',
        );
      }
      const b = raw as Record<string, unknown>;
      const plate_no = typeof b.plate_no === 'string' ? b.plate_no.trim() : '';
      const label = typeof b.label === 'string' ? b.label.trim() : '';
      const seats = parseIntOrNull(b.seats) ?? 5;
      const notes = typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim() : null;
      if (!plate_no) return sendError(res, 400, 'Bad request', 'plate_no required');
      if (seats < 1 || seats > 50) return sendError(res, 400, 'Bad request', 'seats must be 1–50');

      const { rows } = await dbQuery<Row>(
        `
        insert into ${tbl} (plate_no, label, seats, notes, updated_at)
        values ($1, $2, $3, $4, now())
        returning *
      `,
        [plate_no, label || '', seats, notes],
      );
      const row = rows[0];
      if (!row) return sendError(res, 500, 'Failed to create vehicle');
      return res.status(201).json(toVehicle(row));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return sendError(res, 409, 'Conflict', 'ทะเบียนซ้ำ');
      }
      return handleApiError(res, e, 'vehicles POST', { userId: req.user.sub });
    }
  }

  if (method === 'PATCH') {
    try {
      const raw = await readJsonBody(req);
      if (typeof raw !== 'object' || raw === null) {
        return sendError(res, 400, 'Bad request', 'Invalid JSON body');
      }
      const b = raw as Record<string, unknown>;
      const id = getString(b.id);
      if (!id) return sendError(res, 400, 'Bad request', 'id required');

      const { rows: curRows } = await dbQuery<Row>(`select * from ${tbl} where id = $1 limit 1`, [id]);
      const cur = curRows[0];
      if (!cur) return sendError(res, 404, 'Not found');

      const plate =
        b.plate_no !== undefined && typeof b.plate_no === 'string' ? b.plate_no.trim() : cur.plate_no;
      const label =
        b.label !== undefined && typeof b.label === 'string' ? b.label.trim() : cur.label;
      const seats = b.seats !== undefined ? parseIntOrNull(b.seats) ?? cur.seats : cur.seats;
      const is_active =
        b.is_active !== undefined ? Boolean(b.is_active) : cur.is_active;
      const notes =
        b.notes !== undefined && typeof b.notes === 'string' ? b.notes.trim() || null : cur.notes;

      const { rows } = await dbQuery<Row>(
        `
        update ${tbl} set
          plate_no = $2,
          label = $3,
          seats = $4,
          is_active = $5,
          notes = $6,
          updated_at = now()
        where id = $1
        returning *
      `,
        [id, plate, label, seats, is_active, notes],
      );
      const row = rows[0];
      if (!row) return sendError(res, 500, 'Failed to update');
      return res.status(200).json(toVehicle(row));
    } catch (e) {
      return handleApiError(res, e, 'vehicles PATCH', { userId: req.user.sub });
    }
  }

  return sendError(res, 405, 'Method not allowed');
}

export default withAuthStaffCreateSupervisorMutate(handler);
