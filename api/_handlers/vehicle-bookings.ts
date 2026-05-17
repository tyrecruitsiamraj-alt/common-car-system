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
import { insertBookingAudit, listBookingAuditInRange } from '../_lib/bookingAudit.js';

const tbl = tableInAppSchema('vehicle_bookings');
const ACTIVE_ONLY = `coalesce(status, 'active') = 'active'`;
const tblV = tableInAppSchema('vehicles');
const tblE = tableInAppSchema('employees');

type BookingRow = {
  id: string;
  employee_id: string;
  vehicle_id: string;
  starts_at: string | Date;
  ends_at: string | Date;
  notes: string | null;
  destination: string | null;
  status: string;
  created_at: string | Date;
  updated_at: string | Date;
};

function auditUserName(req: AuthedReq): string {
  return req.user.email?.trim() || 'user';
}

function auditUserId(req: AuthedReq): string | null {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(req.user.sub) ? req.user.sub : null;
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function bookingSnapshot(row: BookingRow) {
  return {
    id: row.id,
    employee_id: row.employee_id,
    vehicle_id: row.vehicle_id,
    starts_at: toIso(row.starts_at),
    ends_at: toIso(row.ends_at),
    notes: row.notes || undefined,
    destination: row.destination || undefined,
    status: row.status || 'active',
  };
}

function optionalText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function toBooking(row: BookingRow) {
  return {
    id: row.id,
    employee_id: row.employee_id,
    vehicle_id: row.vehicle_id,
    starts_at: toIso(row.starts_at),
    ends_at: toIso(row.ends_at),
    destination: row.destination || undefined,
    notes: row.notes || undefined,
    status: row.status === 'cancelled' ? 'cancelled' : 'active',
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

function parseIso(v: unknown): Date | null {
  let s = '';
  if (typeof v === 'string') s = v.trim();
  else if (Array.isArray(v) && typeof v[0] === 'string') s = v[0].trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function overlapVehicle(
  vehicleId: string,
  start: Date,
  end: Date,
  excludeId: string | null,
): Promise<boolean> {
  const params: unknown[] = [vehicleId, start.toISOString(), end.toISOString()];
  let sql = `
    select 1 from ${tbl}
    where vehicle_id = $1::uuid
      and starts_at < $3::timestamptz
      and ends_at > $2::timestamptz
      and ${ACTIVE_ONLY}
  `;
  if (excludeId) {
    params.push(excludeId);
    sql += ` and id <> $${params.length}::uuid`;
  }
  sql += ' limit 1';
  const { rows } = await dbQuery<{ ok: number }>(sql, params);
  return rows.length > 0;
}

async function overlapEmployee(
  employeeId: string,
  start: Date,
  end: Date,
  excludeId: string | null,
): Promise<boolean> {
  const params: unknown[] = [employeeId, start.toISOString(), end.toISOString()];
  let sql = `
    select 1 from ${tbl}
    where employee_id = $1::uuid
      and starts_at < $3::timestamptz
      and ends_at > $2::timestamptz
      and ${ACTIVE_ONLY}
  `;
  if (excludeId) {
    params.push(excludeId);
    sql += ` and id <> $${params.length}::uuid`;
  }
  sql += ' limit 1';
  const { rows } = await dbQuery<{ ok: number }>(sql, params);
  return rows.length > 0;
}

type EmpRow = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  phone: string;
  status: string;
  position: string;
  join_date: string | Date;
};

type VehRow = {
  id: string;
  plate_no: string;
  label: string;
  seats: number;
  is_active: boolean;
};

async function handler(req: AuthedReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'GET') {
    const avail = ['1', 'true', 'yes'].includes(
      String(req.query?.availability ?? '')
        .toLowerCase()
        .trim(),
    );
    const fromQ = parseIso(req.query?.from);
    const toQ = parseIso(req.query?.to);
    if (!fromQ || !toQ || fromQ >= toQ) {
      return sendError(res, 400, 'Bad request', 'from and to (ISO 8601) required; from < to');
    }

    const auditLog = ['1', 'true', 'yes'].includes(
      String(req.query?.auditLog ?? '')
        .toLowerCase()
        .trim(),
    );

    try {
      if (auditLog) {
        const audit = await listBookingAuditInRange(fromQ.toISOString(), toQ.toISOString());
        return res.status(200).json({ from: fromQ.toISOString(), to: toQ.toISOString(), audit });
      }

      if (avail) {
        const { rows: empRows } = await dbQuery<EmpRow>(
          `
          select e.*
          from ${tblE} e
          where e.status = 'active'
            and not exists (
              select 1 from ${tbl} vb
              where vb.employee_id = e.id
                and vb.starts_at < $2::timestamptz
                and vb.ends_at > $1::timestamptz
            )
          order by e.first_name, e.last_name
        `,
          [fromQ.toISOString(), toQ.toISOString()],
        );

        const { rows: vehRows } = await dbQuery<VehRow>(
          `
          select v.*
          from ${tblV} v
          where v.is_active = true
            and not exists (
              select 1 from ${tbl} vb
              where vb.vehicle_id = v.id
                and vb.starts_at < $2::timestamptz
                and vb.ends_at > $1::timestamptz
                and coalesce(vb.status, 'active') = 'active'
            )
          order by v.plate_no
        `,
          [fromQ.toISOString(), toQ.toISOString()],
        );

        return res.status(200).json({
          from: fromQ.toISOString(),
          to: toQ.toISOString(),
          availableEmployees: empRows.map((e) => ({
            id: e.id,
            employee_code: e.employee_code,
            first_name: e.first_name,
            last_name: e.last_name,
            nickname: e.nickname || undefined,
            phone: e.phone,
            status: e.status,
            position: e.position,
            join_date: e.join_date instanceof Date ? e.join_date.toISOString().slice(0, 10) : String(e.join_date).slice(0, 10),
          })),
          availableVehicles: vehRows.map((v) => ({
            id: v.id,
            plate_no: v.plate_no,
            label: v.label || undefined,
            seats: v.seats,
            is_active: v.is_active,
          })),
        });
      }

      const { rows } = await dbQuery<BookingRow>(
        `
        select * from ${tbl}
        where starts_at < $2::timestamptz and ends_at > $1::timestamptz
          and ${ACTIVE_ONLY}
        order by starts_at asc
      `,
        [fromQ.toISOString(), toQ.toISOString()],
      );
      return res.status(200).json(rows.map(toBooking));
    } catch (e) {
      return handleApiError(res, e, 'vehicle-bookings GET', { userId: req.user.sub });
    }
  }

  if (method === 'POST') {
    try {
      const raw = await readJsonBody(req);
      if (typeof raw !== 'object' || raw === null) {
        return sendError(res, 400, 'Bad request', 'Invalid JSON body');
      }
      const b = raw as Record<string, unknown>;
      const employee_id = getString(b.employee_id);
      const vehicle_id = getString(b.vehicle_id);
      const starts = parseIso(b.starts_at);
      const ends = parseIso(b.ends_at);
      const destination = optionalText(b.destination);
      const notes = optionalText(b.notes);
      if (!employee_id || !vehicle_id || !starts || !ends) {
        return sendError(res, 400, 'Bad request', 'employee_id, vehicle_id, starts_at, ends_at (ISO) required');
      }
      if (starts >= ends) return sendError(res, 400, 'Bad request', 'ends_at must be after starts_at');

      if (await overlapVehicle(vehicle_id, starts, ends, null)) {
        return sendError(res, 409, 'Conflict', 'รถคันนี้ถูกจองในช่วงเวลานี้แล้ว');
      }
      if (await overlapEmployee(employee_id, starts, ends, null)) {
        return sendError(res, 409, 'Conflict', 'ผู้ขับคนนี้มีการจองทับช่วงเวลานี้แล้ว');
      }

      const { rows } = await dbQuery<BookingRow>(
        `
        insert into ${tbl} (employee_id, vehicle_id, starts_at, ends_at, destination, notes, status, updated_at)
        values ($1::uuid, $2::uuid, $3::timestamptz, $4::timestamptz, $5, $6, 'active', now())
        returning *
      `,
        [employee_id, vehicle_id, starts.toISOString(), ends.toISOString(), destination, notes],
      );
      const row = rows[0];
      if (!row) return sendError(res, 500, 'Failed to create booking');
      await insertBookingAudit({
        bookingId: row.id,
        userId: auditUserId(req),
        userName: auditUserName(req),
        action: 'created',
        oldValue: null,
        newValue: bookingSnapshot(row),
      });
      return res.status(201).json(toBooking(row));
    } catch (e) {
      return handleApiError(res, e, 'vehicle-bookings POST', { userId: req.user.sub });
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

      const { rows: curRows } = await dbQuery<BookingRow>(
        `select * from ${tbl} where id = $1::uuid limit 1`,
        [id],
      );
      const cur = curRows[0];
      if (!cur) return sendError(res, 404, 'Not found');
      if (cur.status === 'cancelled') {
        return sendError(res, 409, 'Conflict', 'การจองนี้ถูกยกเลิกแล้ว — สร้างรายการจองใหม่แทน');
      }

      const employee_id = b.employee_id !== undefined ? getString(b.employee_id) : cur.employee_id;
      const vehicle_id = b.vehicle_id !== undefined ? getString(b.vehicle_id) : cur.vehicle_id;
      const starts = b.starts_at !== undefined ? parseIso(b.starts_at) : new Date(cur.starts_at);
      const ends = b.ends_at !== undefined ? parseIso(b.ends_at) : new Date(cur.ends_at);
      const notes = b.notes !== undefined ? optionalText(b.notes) : cur.notes;
      const destination = b.destination !== undefined ? optionalText(b.destination) : cur.destination;

      if (!employee_id || !vehicle_id || !starts || !ends) {
        return sendError(res, 400, 'Bad request', 'Invalid field values');
      }
      if (starts >= ends) return sendError(res, 400, 'Bad request', 'ends_at must be after starts_at');

      if (await overlapVehicle(vehicle_id, starts, ends, id)) {
        return sendError(res, 409, 'Conflict', 'รถคันนี้ถูกจองในช่วงเวลานี้แล้ว');
      }
      if (await overlapEmployee(employee_id, starts, ends, id)) {
        return sendError(res, 409, 'Conflict', 'ผู้ขับคนนี้มีการจองทับช่วงเวลานี้แล้ว');
      }

      const { rows } = await dbQuery<BookingRow>(
        `
        update ${tbl} set
          employee_id = $2::uuid,
          vehicle_id = $3::uuid,
          starts_at = $4::timestamptz,
          ends_at = $5::timestamptz,
          destination = $6,
          notes = $7,
          updated_at = now()
        where id = $1::uuid and ${ACTIVE_ONLY}
        returning *
      `,
        [id, employee_id, vehicle_id, starts.toISOString(), ends.toISOString(), destination, notes],
      );
      const row = rows[0];
      if (!row) return sendError(res, 404, 'Not found');
      await insertBookingAudit({
        bookingId: row.id,
        userId: auditUserId(req),
        userName: auditUserName(req),
        action: 'updated',
        oldValue: bookingSnapshot(cur),
        newValue: bookingSnapshot(row),
      });
      return res.status(200).json(toBooking(row));
    } catch (e) {
      return handleApiError(res, e, 'vehicle-bookings PATCH', { userId: req.user.sub });
    }
  }

  if (method === 'DELETE') {
    try {
      const id = getString(req.query?.id);
      if (!id) return sendError(res, 400, 'Bad request', 'query id required');

      const { rows: curRows } = await dbQuery<BookingRow>(
        `select * from ${tbl} where id = $1::uuid limit 1`,
        [id],
      );
      const cur = curRows[0];
      if (!cur) return sendError(res, 404, 'Not found');
      if (cur.status === 'cancelled') {
        return res.status(200).json({ ok: true, id, already_cancelled: true });
      }

      const { rows } = await dbQuery<BookingRow>(
        `
        update ${tbl} set status = 'cancelled', updated_at = now()
        where id = $1::uuid and ${ACTIVE_ONLY}
        returning *
      `,
        [id],
      );
      const row = rows[0];
      if (!row) return sendError(res, 404, 'Not found');

      await insertBookingAudit({
        bookingId: row.id,
        userId: auditUserId(req),
        userName: auditUserName(req),
        action: 'cancelled',
        oldValue: bookingSnapshot(cur),
        newValue: bookingSnapshot(row),
      });

      return res.status(200).json({ ok: true, id: row.id, status: 'cancelled' });
    } catch (e) {
      return handleApiError(res, e, 'vehicle-bookings DELETE', { userId: req.user.sub });
    }
  }

  return sendError(res, 405, 'Method not allowed');
}

export default withAuthStaffCreateSupervisorMutate(handler);
