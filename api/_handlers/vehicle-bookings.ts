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
import {
  insertBookingAudit,
  listBookingAuditInRange,
  listBookingAuditForBooking,
} from '../_lib/bookingAudit.js';
import {
  allocateVehicleBookingWorkOrderNo,
  bookingEffectiveEndSql,
  bookingEffectiveEndSqlQualified,
  ensureVehicleBookingCompletedAt,
  ensureVehicleBookingDocumentNo,
  hasVehicleBookingCompletedAt,
} from '../_lib/vehicleBookingsSchema.js';
import { roundDateToMinuteStep } from '../_lib/bookingMinuteStep.js';
import { needsBookingOverlapCheck } from '../_lib/bookingOverlap.js';
import {
  bookingWasCancelled,
  createBookingRequestId,
  findEmployeeBookingConflict,
  findVehicleBookingConflict,
  logBookingAction,
  sendBookingConflictIfOverlap,
  sendBookingScheduleConflict,
  sendStaleCancelledConflict,
  type BookingAttemptContext,
} from '../_lib/bookingConflict.js';
import { userCanEditCompletedBookingTimes } from '../_lib/fleetBookingPermissions.js';

const tbl = tableInAppSchema('vehicle_bookings');
const ACTIVE_ONLY = `coalesce(status, 'active') = 'active'`;
const tblV = tableInAppSchema('vehicles');
const tblE = tableInAppSchema('employees');

type BookingRow = {
  id: string;
  work_order_no: string | null;
  employee_id: string;
  vehicle_id: string;
  starts_at: string | Date;
  ends_at: string | Date;
  notes: string | null;
  destination: string | null;
  document_no: string | null;
  status: string;
  completed_at: string | Date | null;
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
    ...(row.work_order_no?.trim() ? { work_order_no: row.work_order_no.trim() } : {}),
    employee_id: row.employee_id,
    vehicle_id: row.vehicle_id,
    starts_at: toIso(row.starts_at),
    ends_at: toIso(row.ends_at),
    notes: row.notes || undefined,
    destination: row.destination || undefined,
    document_no: row.document_no?.trim() || undefined,
    status: row.status || 'active',
    completed_at: row.completed_at ? toIso(row.completed_at) : undefined,
  };
}

function optionalText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function toBooking(row: BookingRow) {
  return {
    id: row.id,
    ...(row.work_order_no?.trim() ? { work_order_no: row.work_order_no.trim() } : {}),
    employee_id: row.employee_id,
    vehicle_id: row.vehicle_id,
    starts_at: toIso(row.starts_at),
    ends_at: toIso(row.ends_at),
    destination: row.destination || undefined,
    document_no: row.document_no?.trim() || undefined,
    notes: row.notes || undefined,
    status: row.status === 'cancelled' ? 'cancelled' : 'active',
    completed_at: row.completed_at ? toIso(row.completed_at) : undefined,
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

function bookingTimeFromIso(v: unknown): Date | null {
  const d = parseIso(v);
  return d ? roundDateToMinuteStep(d) : null;
}

async function rejectIfScheduleConflict(
  req: AuthedReq,
  res: ApiRes,
  requestId: string,
  opts: {
    vehicleId: string;
    employeeId: string;
    starts: Date;
    ends: Date;
    excludeId: string | null;
    effectiveEndSql: string;
    action: BookingAttemptContext['action'];
    bookingId?: string;
    logContext: string;
  },
): Promise<boolean> {
  const attempted: BookingAttemptContext = {
    action: opts.action,
    employee_id: opts.employeeId,
    vehicle_id: opts.vehicleId,
    starts_at: opts.starts.toISOString(),
    ends_at: opts.ends.toISOString(),
    booking_id: opts.bookingId,
  };
  const vehicleConflict = await findVehicleBookingConflict(
    tbl,
    opts.vehicleId,
    opts.starts,
    opts.ends,
    opts.excludeId,
    opts.effectiveEndSql,
  );
  if (vehicleConflict) {
    sendBookingScheduleConflict(res, req, {
      requestId,
      kind: 'vehicle',
      attempted,
      conflict: vehicleConflict,
      logContext: opts.logContext,
    });
    return true;
  }
  const employeeConflict = await findEmployeeBookingConflict(
    tbl,
    opts.employeeId,
    opts.starts,
    opts.ends,
    opts.excludeId,
    opts.effectiveEndSql,
  );
  if (employeeConflict) {
    sendBookingScheduleConflict(res, req, {
      requestId,
      kind: 'employee',
      attempted,
      conflict: employeeConflict,
      logContext: opts.logContext,
    });
    return true;
  }
  return false;
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
  const useCompletedAt = await hasVehicleBookingCompletedAt();
  const effectiveEnd = bookingEffectiveEndSql(useCompletedAt);
  const vbEffectiveEnd = bookingEffectiveEndSqlQualified('vb', useCompletedAt);

  if (method === 'GET') {
    const avail = ['1', 'true', 'yes'].includes(
      String(req.query?.availability ?? '')
        .toLowerCase()
        .trim(),
    );
    const auditLog = ['1', 'true', 'yes'].includes(
      String(req.query?.auditLog ?? '')
        .toLowerCase()
        .trim(),
    );

    try {
      if (auditLog) {
        const bookingId = getString(req.query?.booking_id);
        if (bookingId) {
          const audit = await listBookingAuditForBooking(bookingId);
          return res.status(200).json({ booking_id: bookingId, audit });
        }
        const fromQ = parseIso(req.query?.from);
        const toQ = parseIso(req.query?.to);
        if (!fromQ || !toQ || fromQ >= toQ) {
          return sendError(res, 400, 'Bad request', 'from and to (ISO 8601) required; from < to');
        }
        const audit = await listBookingAuditInRange(fromQ.toISOString(), toQ.toISOString());
        return res.status(200).json({ from: fromQ.toISOString(), to: toQ.toISOString(), audit });
      }

      const fromQ = parseIso(req.query?.from);
      const toQ = parseIso(req.query?.to);
      if (!fromQ || !toQ || fromQ >= toQ) {
        return sendError(res, 400, 'Bad request', 'from and to (ISO 8601) required; from < to');
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
                and ${vbEffectiveEnd} > $1::timestamptz
                and coalesce(vb.status, 'active') = 'active'
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
                and ${vbEffectiveEnd} > $1::timestamptz
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
        where starts_at < $2::timestamptz and ${effectiveEnd} > $1::timestamptz
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
    const requestId = createBookingRequestId();
    let postAttempt: BookingAttemptContext = { action: 'create' };
    try {
      const raw = await readJsonBody(req);
      if (typeof raw !== 'object' || raw === null) {
        return sendError(res, 400, 'Bad request', 'Invalid JSON body');
      }
      const b = raw as Record<string, unknown>;
      const employee_id = getString(b.employee_id);
      const vehicle_id = getString(b.vehicle_id);
      const starts = bookingTimeFromIso(b.starts_at);
      const ends = bookingTimeFromIso(b.ends_at);
      const destination = optionalText(b.destination);
      const document_no = optionalText(b.document_no);
      const notes = optionalText(b.notes);
      if (!employee_id || !vehicle_id || !starts || !ends) {
        return sendError(res, 400, 'Bad request', 'employee_id, vehicle_id, starts_at, ends_at (ISO) required');
      }
      if (starts >= ends) return sendError(res, 400, 'Bad request', 'ends_at must be after starts_at');

      postAttempt = {
        action: 'create',
        employee_id,
        vehicle_id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
      };

      if (
        await rejectIfScheduleConflict(req, res, requestId, {
          vehicleId: vehicle_id,
          employeeId: employee_id,
          starts,
          ends,
          excludeId: null,
          effectiveEndSql: effectiveEnd,
          action: 'create',
          logContext: 'vehicle-bookings POST schedule conflict',
        })
      ) {
        return;
      }

      await ensureVehicleBookingDocumentNo();
      const work_order_no = await allocateVehicleBookingWorkOrderNo();
      const { rows } = await dbQuery<BookingRow>(
        `
        insert into ${tbl} (
          employee_id, vehicle_id, starts_at, ends_at, destination, document_no, notes, status, work_order_no, updated_at
        )
        values ($1::uuid, $2::uuid, $3::timestamptz, $4::timestamptz, $5, $6, $7, 'active', $8, now())
        returning *
      `,
        [
          employee_id,
          vehicle_id,
          starts.toISOString(),
          ends.toISOString(),
          destination,
          document_no,
          notes,
          work_order_no,
        ],
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
      logBookingAction('vehicle-booking created', requestId, req, {
        bookingId: row.id,
        vehicle_id,
        employee_id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        work_order_no: row.work_order_no,
      });
      return res.status(201).json(toBooking(row));
    } catch (e) {
      if (
        await sendBookingConflictIfOverlap(res, req, e, {
          requestId,
          tbl,
          effectiveEndSql: effectiveEnd,
          attempted: postAttempt,
          vehicleId: postAttempt.vehicle_id,
          employeeId: postAttempt.employee_id,
          starts: postAttempt.starts_at ? new Date(postAttempt.starts_at) : undefined,
          ends: postAttempt.ends_at ? new Date(postAttempt.ends_at) : undefined,
          logContext: 'vehicle-bookings POST db conflict',
        })
      ) {
        return;
      }
      return handleApiError(res, e, 'vehicle-bookings POST', {
        userId: req.user.sub,
        requestId,
      });
    }
  }

  if (method === 'PATCH') {
    const requestId = createBookingRequestId();
    let patchAttempt: BookingAttemptContext = { action: 'update' };
    let patchEffectiveEndSql = effectiveEnd;
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

      const editCompletedTimes = b.edit_completed_times === true;
      const markCompleted = b.mark_completed === true;

      if (cur.status === 'cancelled') {
        sendStaleCancelledConflict(res, req, requestId, {
          action: markCompleted ? 'complete' : 'update',
          booking_id: id,
        }, 'vehicle-bookings PATCH stale cancelled');
        return;
      }

      if (cur.completed_at) {
        if (!editCompletedTimes) {
          return sendError(res, 409, 'Conflict', 'การจองนี้เสร็จสิ้นแล้ว — แก้ไขไม่ได้');
        }
        if (!(await userCanEditCompletedBookingTimes(req.user.sub))) {
          return sendError(
            res,
            403,
            'Forbidden',
            'เฉพาะผู้ที่ได้รับมอบหมายจาก Admin เท่านั้นที่แก้เวลาใบงานที่ปิดแล้ว',
          );
        }
        if (markCompleted) {
          return sendError(res, 400, 'Bad request', 'ใบงานปิดแล้ว');
        }
      }

      let supportsCompletedAt = useCompletedAt;
      if (markCompleted || editCompletedTimes) {
        supportsCompletedAt = await ensureVehicleBookingCompletedAt();
        if (!supportsCompletedAt) {
          return sendError(
            res,
            503,
            'Schema not ready',
            'ยังไม่มีคอลัมน์ completed_at — รัน npm run db:migrate บนฐานข้อมูล production',
          );
        }
      }
      const patchEffectiveEnd = bookingEffectiveEndSql(supportsCompletedAt);
      patchEffectiveEndSql = patchEffectiveEnd;
      if (markCompleted && cur.completed_at) {
        return sendError(res, 409, 'Conflict', 'การจองนี้เสร็จสิ้นแล้ว');
      }

      let employee_id = cur.employee_id;
      let vehicle_id = cur.vehicle_id;
      let notes = cur.notes;
      let destination = cur.destination;
      let document_no = cur.document_no?.trim() || null;

      if (!editCompletedTimes) {
        employee_id = b.employee_id !== undefined ? getString(b.employee_id) ?? cur.employee_id : cur.employee_id;
        vehicle_id = b.vehicle_id !== undefined ? getString(b.vehicle_id) ?? cur.vehicle_id : cur.vehicle_id;
        notes = b.notes !== undefined ? optionalText(b.notes) : cur.notes;
        destination = b.destination !== undefined ? optionalText(b.destination) : cur.destination;
        document_no =
          b.document_no !== undefined ? optionalText(b.document_no) : cur.document_no?.trim() || null;
      }

      let starts =
        b.starts_at !== undefined ? bookingTimeFromIso(b.starts_at) : roundDateToMinuteStep(new Date(cur.starts_at));
      let ends =
        b.ends_at !== undefined ? bookingTimeFromIso(b.ends_at) : roundDateToMinuteStep(new Date(cur.ends_at));
      let completedAt: Date | null = cur.completed_at ? new Date(cur.completed_at) : null;

      if (editCompletedTimes && b.completed_at !== undefined) {
        const parsedCompleted = bookingTimeFromIso(b.completed_at);
        if (!parsedCompleted) {
          return sendError(res, 400, 'Bad request', 'completed_at invalid');
        }
        completedAt = parsedCompleted;
      }

      if (markCompleted) {
        const now = roundDateToMinuteStep(new Date());
        completedAt = now;
        const userSetEnds = b.ends_at !== undefined;
        const userSetStarts = b.starts_at !== undefined;
        if (!userSetStarts && !starts) starts = roundDateToMinuteStep(new Date(cur.starts_at));
        if (!userSetEnds) {
          ends = roundDateToMinuteStep(new Date(cur.ends_at));
        }
      }

      if (starts) starts = roundDateToMinuteStep(starts);
      if (ends) ends = roundDateToMinuteStep(ends);
      if (completedAt) completedAt = roundDateToMinuteStep(completedAt);
      if (completedAt && ends && completedAt > ends) completedAt = ends;
      if (completedAt && starts && completedAt < starts) {
        return sendError(res, 400, 'Bad request', 'เวลาปิดงานต้องอยู่ในช่วงเริ่ม–สิ้นสุดที่จอง');
      }

      if (!employee_id || !vehicle_id || !starts || !ends) {
        return sendError(res, 400, 'Bad request', 'Invalid field values');
      }
      if (starts >= ends) return sendError(res, 400, 'Bad request', 'ends_at must be after starts_at');

      patchAttempt = {
        action: markCompleted ? 'complete' : 'update',
        booking_id: id,
        employee_id,
        vehicle_id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
      };

      const overlapPatch = editCompletedTimes
        ? { starts_at: b.starts_at, ends_at: b.ends_at, completed_at: b.completed_at }
        : b;
      const needsOverlapCheck = needsBookingOverlapCheck(
        cur,
        overlapPatch,
        employee_id,
        vehicle_id,
        starts,
        ends,
        completedAt,
      );
      const proposedEffectiveEnd = completedAt ?? ends;
      if (
        needsOverlapCheck &&
        (await rejectIfScheduleConflict(req, res, requestId, {
          vehicleId: vehicle_id,
          employeeId: employee_id,
          starts,
          ends: proposedEffectiveEnd,
          excludeId: id,
          effectiveEndSql: patchEffectiveEndSql,
          action: patchAttempt.action,
          bookingId: id,
          logContext: 'vehicle-bookings PATCH schedule conflict',
        }))
      ) {
        return;
      }

      await ensureVehicleBookingDocumentNo();
      const { rows } = supportsCompletedAt
        ? await dbQuery<BookingRow>(
            `
        update ${tbl} set
          employee_id = $2::uuid,
          vehicle_id = $3::uuid,
          starts_at = $4::timestamptz,
          ends_at = $5::timestamptz,
          destination = $6,
          document_no = $7,
          notes = $8,
          completed_at = $9::timestamptz,
          updated_at = now()
        where id = $1::uuid and ${ACTIVE_ONLY}
        returning *
      `,
            [
              id,
              employee_id,
              vehicle_id,
              starts.toISOString(),
              ends.toISOString(),
              destination,
              document_no,
              notes,
              completedAt ? completedAt.toISOString() : null,
            ],
          )
        : await dbQuery<BookingRow>(
            `
        update ${tbl} set
          employee_id = $2::uuid,
          vehicle_id = $3::uuid,
          starts_at = $4::timestamptz,
          ends_at = $5::timestamptz,
          destination = $6,
          document_no = $7,
          notes = $8,
          updated_at = now()
        where id = $1::uuid and ${ACTIVE_ONLY}
        returning *
      `,
            [
              id,
              employee_id,
              vehicle_id,
              starts.toISOString(),
              ends.toISOString(),
              destination,
              document_no,
              notes,
            ],
          );
      const row = rows[0];
      if (!row) {
        if (await bookingWasCancelled(tbl, id)) {
          sendStaleCancelledConflict(res, req, requestId, patchAttempt, 'vehicle-bookings PATCH stale race');
          return;
        }
        return sendError(res, 404, 'Not found');
      }
      await insertBookingAudit({
        bookingId: row.id,
        userId: auditUserId(req),
        userName: auditUserName(req),
        action: 'updated',
        oldValue: bookingSnapshot(cur),
        newValue: bookingSnapshot(row),
      });
      logBookingAction(
        markCompleted ? 'vehicle-booking completed' : 'vehicle-booking updated',
        requestId,
        req,
        {
          bookingId: row.id,
          vehicle_id,
          employee_id,
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
          ...(row.completed_at ? { completed_at: toIso(row.completed_at) } : {}),
        },
      );
      return res.status(200).json(toBooking(row));
    } catch (e) {
      if (
        await sendBookingConflictIfOverlap(res, req, e, {
          requestId,
          tbl,
          effectiveEndSql: patchEffectiveEndSql,
          attempted: patchAttempt,
          vehicleId: patchAttempt.vehicle_id,
          employeeId: patchAttempt.employee_id,
          starts: patchAttempt.starts_at ? new Date(patchAttempt.starts_at) : undefined,
          ends: patchAttempt.ends_at ? new Date(patchAttempt.ends_at) : undefined,
          excludeId: patchAttempt.booking_id ?? null,
          logContext: 'vehicle-bookings PATCH db conflict',
        })
      ) {
        return;
      }
      return handleApiError(res, e, 'vehicle-bookings PATCH', {
        userId: req.user.sub,
        requestId,
      });
    }
  }

  if (method === 'DELETE') {
    const requestId = createBookingRequestId();
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
      if (cur.completed_at) {
        return sendError(res, 409, 'Conflict', 'การจองนี้เสร็จสิ้นแล้ว — ยกเลิกไม่ได้');
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
      if (!row) {
        if (await bookingWasCancelled(tbl, id)) {
          sendStaleCancelledConflict(res, req, requestId, { action: 'cancel', booking_id: id }, 'vehicle-bookings DELETE stale race');
          return;
        }
        return sendError(res, 404, 'Not found');
      }

      await insertBookingAudit({
        bookingId: row.id,
        userId: auditUserId(req),
        userName: auditUserName(req),
        action: 'cancelled',
        oldValue: bookingSnapshot(cur),
        newValue: bookingSnapshot(row),
      });

      logBookingAction('vehicle-booking cancelled', requestId, req, {
        bookingId: row.id,
        vehicle_id: row.vehicle_id,
        employee_id: row.employee_id,
        starts_at: toIso(row.starts_at),
        ends_at: toIso(row.ends_at),
      });

      return res.status(200).json({ ok: true, id: row.id, status: 'cancelled' });
    } catch (e) {
      return handleApiError(res, e, 'vehicle-bookings DELETE', {
        userId: req.user.sub,
        requestId,
      });
    }
  }

  return sendError(res, 405, 'Method not allowed');
}

export default withAuthStaffWrite(handler);
