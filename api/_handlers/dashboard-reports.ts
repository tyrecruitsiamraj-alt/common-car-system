import { dbQuery } from '../_lib/postgres.js';
import { withAuthStaffWrite, sendError, handleApiError, type ApiRes, type AuthedReq } from '../_lib/http.js';
import { getString } from '../_lib/body.js';
import { tableInAppSchema } from '../_lib/schema.js';
import {
  DERIVED_STATUS_CASE,
  PRIORITY_CASE,
  VALID_DERIVED_STATUSES,
  buildScoredBookingsFrom,
  type DashboardReportFilterParams,
} from '../_lib/dashboardReportsSql.js';
import { toBooking, type BookingRow } from './vehicle-bookings.js';

const tblV = tableInAppSchema('vehicles');

function parseIso(v: unknown): Date | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseLimitOffset(query: Record<string, unknown> | undefined): { limit: number; offset: number } {
  const rawLimit = getString(query?.limit);
  const rawOffset = getString(query?.offset);
  const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit ?? '', 10) || 10));
  const offset = Math.max(0, Number.parseInt(rawOffset ?? '', 10) || 0);
  return { limit, offset };
}

function readCommonFilters(query: Record<string, unknown> | undefined): DashboardReportFilterParams | null {
  const from = parseIso(query?.from);
  const to = parseIso(query?.to);
  if (!from || !to || from >= to) return null;
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    ownerId: getString(query?.ownerId),
    vehicleId: getString(query?.vehicleId),
    search: getString(query?.search),
  };
}

async function handleWorkQueue(req: AuthedReq, res: ApiRes, filters: DashboardReportFilterParams): Promise<void> {
  const { limit, offset } = parseLimitOffset(req.query);
  const status = getString(req.query?.status);
  const statusFilter = status && VALID_DERIVED_STATUSES.has(status) ? status : null;

  const { sql: fromSql, params: baseParams } = buildScoredBookingsFrom(filters);
  const statusWhere = statusFilter ? `where derived_status = $${baseParams.length + 1}` : '';

  const rowsParams = statusFilter ? [...baseParams, statusFilter, limit, offset] : [...baseParams, limit, offset];
  const { rows } = await dbQuery<BookingRow & { derived_status: string; priority: number }>(
    `
    with scored as (
      select vb.*, (${DERIVED_STATUS_CASE}) as derived_status
      ${fromSql}
    )
    select *, (${PRIORITY_CASE}) as priority
    from scored
    ${statusWhere}
    order by priority asc, coalesce(completed_at, ends_at, created_at) desc
    limit $${rowsParams.length - 1} offset $${rowsParams.length}
  `,
    rowsParams,
  );

  const countParams = statusFilter ? [...baseParams, statusFilter] : baseParams;
  const { rows: countRows } = await dbQuery<{ count: number }>(
    `
    with scored as (
      select vb.*, (${DERIVED_STATUS_CASE}) as derived_status
      ${fromSql}
    )
    select count(*)::int as count from scored ${statusWhere}
  `,
    countParams,
  );

  res.setHeader?.('X-Total-Count', String(countRows[0]?.count ?? rows.length));
  res.status(200).json(rows.map((r) => toBooking(r)));
}

async function handleVehicleUsage(req: AuthedReq, res: ApiRes, filters: DashboardReportFilterParams): Promise<void> {
  const { limit, offset } = parseLimitOffset(req.query);
  const status = getString(req.query?.status);
  const statusFilter = status && VALID_DERIVED_STATUSES.has(status) ? status : null;

  const { sql: fromSql, params: baseParams } = buildScoredBookingsFrom(filters);
  const statusWhere = statusFilter ? `where derived_status = $${baseParams.length + 1}` : '';
  const rowsParams = statusFilter ? [...baseParams, statusFilter, limit, offset] : [...baseParams, limit, offset];

  const { rows } = await dbQuery<{ id: string; plate_no: string; label: string; cnt: number }>(
    `
    with scored as (
      select vb.*, (${DERIVED_STATUS_CASE}) as derived_status
      ${fromSql}
    )
    select v.id, v.plate_no, v.label, count(*)::int as cnt
    from scored
    join ${tblV} v on v.id = scored.vehicle_id
    ${statusWhere}
    group by v.id, v.plate_no, v.label
    order by cnt desc, v.plate_no
    limit $${rowsParams.length - 1} offset $${rowsParams.length}
  `,
    rowsParams,
  );

  const countParams = statusFilter ? [...baseParams, statusFilter] : baseParams;
  const { rows: countRows } = await dbQuery<{ count: number }>(
    `
    with scored as (
      select vb.*, (${DERIVED_STATUS_CASE}) as derived_status
      ${fromSql}
    )
    select count(*)::int as count from (
      select v.id from scored join ${tblV} v on v.id = scored.vehicle_id ${statusWhere} group by v.id
    ) t
  `,
    countParams,
  );

  const grandTotalParams = statusFilter ? [...baseParams, statusFilter] : baseParams;
  const { rows: grandRows } = await dbQuery<{ count: number }>(
    `
    with scored as (
      select vb.*, (${DERIVED_STATUS_CASE}) as derived_status
      ${fromSql}
    )
    select count(*)::int as count from scored ${statusWhere}
  `,
    grandTotalParams,
  );
  const grandTotal = grandRows[0]?.count || 1;

  res.setHeader?.('X-Total-Count', String(countRows[0]?.count ?? rows.length));
  res.status(200).json(
    rows.map((r) => ({
      id: r.id,
      plateNo: r.plate_no,
      label: r.label,
      count: r.cnt,
      share: Math.round((r.cnt / grandTotal) * 100),
    })),
  );
}

async function handleEmployeeHours(req: AuthedReq, res: ApiRes, filters: DashboardReportFilterParams): Promise<void> {
  const { limit, offset } = parseLimitOffset(req.query);
  const status = getString(req.query?.status);
  const statusFilter = status && VALID_DERIVED_STATUSES.has(status) ? status : null;

  const { sql: fromSql, params: baseParams } = buildScoredBookingsFrom(filters);
  const clauses = [`scored.derived_status != 'cancelled'`];
  if (statusFilter) clauses.push(`scored.derived_status = $${baseParams.length + 1}`);
  const where = `where ${clauses.join(' and ')}`;
  const rowsParams = statusFilter ? [...baseParams, statusFilter, limit, offset] : [...baseParams, limit, offset];

  const { rows } = await dbQuery<{
    employee_id: string;
    first_name: string | null;
    last_name: string | null;
    day_ymd: string;
    trip_count: number;
    planned_hours: number;
    actual_hours: number;
  }>(
    `
    with scored as (
      select vb.*, e.first_name, e.last_name, (${DERIVED_STATUS_CASE}) as derived_status
      ${fromSql}
    )
    select
      scored.employee_id,
      scored.first_name,
      scored.last_name,
      to_char((scored.starts_at at time zone 'Asia/Bangkok')::date, 'YYYY-MM-DD') as day_ymd,
      count(*)::int as trip_count,
      sum(extract(epoch from (scored.ends_at - scored.starts_at)) / 3600.0) as planned_hours,
      sum(extract(epoch from (coalesce(scored.completed_at, scored.ends_at) - scored.starts_at)) / 3600.0) as actual_hours
    from scored
    ${where}
    group by scored.employee_id, scored.first_name, scored.last_name, day_ymd
    order by day_ymd desc, scored.first_name, scored.last_name
    limit $${rowsParams.length - 1} offset $${rowsParams.length}
  `,
    rowsParams,
  );

  const countParams = statusFilter ? [...baseParams, statusFilter] : baseParams;
  const { rows: countRows } = await dbQuery<{ count: number }>(
    `
    with scored as (
      select vb.*, (${DERIVED_STATUS_CASE}) as derived_status
      ${fromSql}
    )
    select count(*)::int as count from (
      select scored.employee_id, to_char((scored.starts_at at time zone 'Asia/Bangkok')::date, 'YYYY-MM-DD') as day_ymd
      from scored
      ${where}
      group by scored.employee_id, day_ymd
    ) t
  `,
    countParams,
  );

  res.setHeader?.('X-Total-Count', String(countRows[0]?.count ?? rows.length));
  res.status(200).json(
    rows.map((r) => {
      const planned = Math.round(Number(r.planned_hours) * 10) / 10;
      const actual = Math.round(Number(r.actual_hours) * 10) / 10;
      const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.employee_id.slice(0, 8);
      return {
        key: `${r.employee_id}|${r.day_ymd}`,
        employeeId: r.employee_id,
        employeeName: name,
        dateYmd: r.day_ymd,
        tripCount: r.trip_count,
        plannedHours: planned,
        actualHours: actual,
        diffHours: Math.round((actual - planned) * 10) / 10,
      };
    }),
  );
}

async function handler(req: AuthedReq, res: ApiRes): Promise<void> {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') return sendError(res, 405, 'Method not allowed');

  const report = getString(req.query?.report);
  if (!report || !['work_queue', 'vehicle_usage', 'employee_hours'].includes(report)) {
    return sendError(res, 400, 'Bad request', 'report must be one of work_queue | vehicle_usage | employee_hours');
  }

  const filters = readCommonFilters(req.query);
  if (!filters) {
    return sendError(res, 400, 'Bad request', 'from and to (ISO 8601) required; from < to');
  }

  try {
    if (report === 'work_queue') return await handleWorkQueue(req, res, filters);
    if (report === 'vehicle_usage') return await handleVehicleUsage(req, res, filters);
    return await handleEmployeeHours(req, res, filters);
  } catch (e) {
    return handleApiError(res, e, `dashboard-reports GET (${report})`, { userId: req.user.sub });
  }
}

export default withAuthStaffWrite(handler);
