import { randomUUID } from 'node:crypto';
import type { ApiRes, AuthedReq } from './http.js';
import { sendError } from './http.js';
import { logInfo, logWarn } from './logger.js';
import { dbQuery } from './postgres.js';

export type BookingConflictKind = 'vehicle' | 'employee';

export type BookingConflictDetail = {
  id: string;
  vehicle_id: string;
  employee_id: string;
  starts_at: string;
  ends_at: string;
  completed_at?: string;
  effective_end: string;
  status: string;
  work_order_no?: string;
};

export type BookingAttemptContext = {
  action: 'create' | 'update' | 'complete' | 'cancel';
  employee_id?: string;
  vehicle_id?: string;
  starts_at?: string;
  ends_at?: string;
  booking_id?: string;
};

export const BOOKING_CONFLICT_MESSAGES = {
  vehicle: 'รถคันนี้ถูกจองในช่วงเวลานี้แล้ว',
  employee: 'พนักงานคนนี้มีการจองทับช่วงเวลานี้แล้ว',
  generic: 'มีการจองทับช่วงเวลานี้แล้ว',
  staleCancelled: 'รายการเดิมถูกยกเลิกแล้ว กรุณารีเฟรชข้อมูล',
} as const;

const ACTIVE_ONLY = `coalesce(status, 'active') = 'active'`;

type ConflictRow = {
  id: string;
  work_order_no: string | null;
  employee_id: string;
  vehicle_id: string;
  starts_at: string | Date;
  ends_at: string | Date;
  completed_at: string | Date | null;
  status: string;
  effective_end: string | Date;
};

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

export function createBookingRequestId(): string {
  return randomUUID();
}

export function userSeesConflictDetail(role: string | undefined): boolean {
  return role === 'admin';
}

export function conflictDetailFromRow(row: ConflictRow): BookingConflictDetail {
  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
    employee_id: row.employee_id,
    starts_at: toIso(row.starts_at),
    ends_at: toIso(row.ends_at),
    ...(row.completed_at ? { completed_at: toIso(row.completed_at) } : {}),
    effective_end: toIso(row.effective_end),
    status: row.status || 'active',
    ...(row.work_order_no?.trim() ? { work_order_no: row.work_order_no.trim() } : {}),
  };
}

export async function findVehicleBookingConflict(
  tbl: string,
  vehicleId: string,
  start: Date,
  end: Date,
  excludeId: string | null,
  effectiveEndSql: string,
): Promise<BookingConflictDetail | null> {
  const params: unknown[] = [vehicleId, start.toISOString(), end.toISOString()];
  let sql = `
    select
      id,
      work_order_no,
      employee_id,
      vehicle_id,
      starts_at,
      ends_at,
      completed_at,
      status,
      ${effectiveEndSql} as effective_end
    from ${tbl}
    where vehicle_id = $1::uuid
      and starts_at < $3::timestamptz
      and ${effectiveEndSql} > $2::timestamptz
      and ${ACTIVE_ONLY}
  `;
  if (excludeId) {
    params.push(excludeId);
    sql += ` and id <> $${params.length}::uuid`;
  }
  sql += ' order by starts_at limit 1';
  const { rows } = await dbQuery<ConflictRow>(sql, params);
  return rows[0] ? conflictDetailFromRow(rows[0]) : null;
}

export async function findEmployeeBookingConflict(
  tbl: string,
  employeeId: string,
  start: Date,
  end: Date,
  excludeId: string | null,
  effectiveEndSql: string,
): Promise<BookingConflictDetail | null> {
  const params: unknown[] = [employeeId, start.toISOString(), end.toISOString()];
  let sql = `
    select
      id,
      work_order_no,
      employee_id,
      vehicle_id,
      starts_at,
      ends_at,
      completed_at,
      status,
      ${effectiveEndSql} as effective_end
    from ${tbl}
    where employee_id = $1::uuid
      and starts_at < $3::timestamptz
      and ${effectiveEndSql} > $2::timestamptz
      and ${ACTIVE_ONLY}
  `;
  if (excludeId) {
    params.push(excludeId);
    sql += ` and id <> $${params.length}::uuid`;
  }
  sql += ' order by starts_at limit 1';
  const { rows } = await dbQuery<ConflictRow>(sql, params);
  return rows[0] ? conflictDetailFromRow(rows[0]) : null;
}

export function logBookingAction(
  msg: string,
  requestId: string,
  req: AuthedReq,
  fields?: Record<string, unknown>,
): void {
  logInfo(msg, {
    requestId,
    userId: req.user.sub,
    userRole: req.user.role,
    ...fields,
  });
}

export function sendBookingScheduleConflict(
  res: ApiRes,
  req: AuthedReq,
  opts: {
    requestId: string;
    kind: BookingConflictKind;
    attempted: BookingAttemptContext;
    conflict: BookingConflictDetail;
    logContext: string;
  },
): void {
  logWarn(opts.logContext, {
    requestId: opts.requestId,
    userId: req.user.sub,
    userRole: req.user.role,
    conflictKind: opts.kind,
    attempted: opts.attempted,
    conflictingBooking: opts.conflict,
  });
  const message =
    opts.kind === 'vehicle'
      ? BOOKING_CONFLICT_MESSAGES.vehicle
      : BOOKING_CONFLICT_MESSAGES.employee;
  const extra: Record<string, unknown> = { request_id: opts.requestId };
  if (userSeesConflictDetail(req.user.role)) {
    extra.conflict = opts.conflict;
  }
  sendError(res, 409, 'Conflict', message, extra);
}

type PgError = {
  code?: string;
  constraint?: string;
};

export function isBookingOverlapDbError(e: unknown): boolean {
  return (e as PgError)?.code === '23P01';
}

function conflictKindFromDbError(e: unknown): BookingConflictKind | null {
  const constraint = String((e as PgError).constraint ?? '');
  if (constraint.includes('employee')) return 'employee';
  if (constraint.includes('vehicle')) return 'vehicle';
  return null;
}

export async function sendBookingConflictIfOverlap(
  res: ApiRes,
  req: AuthedReq,
  e: unknown,
  opts: {
    requestId: string;
    tbl: string;
    effectiveEndSql: string;
    attempted: BookingAttemptContext;
    vehicleId?: string;
    employeeId?: string;
    starts?: Date;
    ends?: Date;
    excludeId?: string | null;
    logContext: string;
  },
): Promise<boolean> {
  if (!isBookingOverlapDbError(e)) return false;

  const kind = conflictKindFromDbError(e);
  let conflict: BookingConflictDetail | null = null;
  if (kind && opts.starts && opts.ends) {
    if (kind === 'vehicle' && opts.vehicleId) {
      conflict = await findVehicleBookingConflict(
        opts.tbl,
        opts.vehicleId,
        opts.starts,
        opts.ends,
        opts.excludeId ?? null,
        opts.effectiveEndSql,
      );
    } else if (kind === 'employee' && opts.employeeId) {
      conflict = await findEmployeeBookingConflict(
        opts.tbl,
        opts.employeeId,
        opts.starts,
        opts.ends,
        opts.excludeId ?? null,
        opts.effectiveEndSql,
      );
    }
  }

  logWarn(opts.logContext, {
    requestId: opts.requestId,
    userId: req.user.sub,
    userRole: req.user.role,
    conflictKind: kind ?? 'unknown',
    dbConstraint: (e as PgError).constraint,
    attempted: opts.attempted,
    ...(conflict ? { conflictingBooking: conflict } : {}),
  });

  const message =
    kind === 'employee'
      ? BOOKING_CONFLICT_MESSAGES.employee
      : kind === 'vehicle'
        ? BOOKING_CONFLICT_MESSAGES.vehicle
        : BOOKING_CONFLICT_MESSAGES.generic;
  const extra: Record<string, unknown> = { request_id: opts.requestId };
  if (conflict && userSeesConflictDetail(req.user.role)) {
    extra.conflict = conflict;
  }
  sendError(res, 409, 'Conflict', message, extra);
  return true;
}

export async function bookingWasCancelled(tbl: string, bookingId: string): Promise<boolean> {
  const { rows } = await dbQuery<{ status: string }>(
    `select status from ${tbl} where id = $1::uuid limit 1`,
    [bookingId],
  );
  return rows[0]?.status === 'cancelled';
}

export function sendStaleCancelledConflict(
  res: ApiRes,
  req: AuthedReq,
  requestId: string,
  attempted: BookingAttemptContext,
  logContext: string,
): void {
  logWarn(logContext, {
    requestId,
    userId: req.user.sub,
    userRole: req.user.role,
    stale: true,
    attempted,
  });
  sendError(res, 409, 'Conflict', BOOKING_CONFLICT_MESSAGES.staleCancelled, {
    request_id: requestId,
  });
}
