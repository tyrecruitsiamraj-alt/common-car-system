import { tableInAppSchema } from './schema.js';

/**
 * สถานะที่คำนวณจาก business logic เดียวกับ src/lib/dashboard/buildDashboardData.ts
 * (mapTaskStatus / isBookingOverdueNotCompleted / isAtRiskBooking) — คง sync กันไว้ถ้าแก้ฝั่งใดฝั่งหนึ่ง
 */
export const DERIVED_STATUS_CASE = `
  case
    when vb.status = 'cancelled' then 'cancelled'
    when vb.completed_at is not null then 'completed'
    when vb.ends_at <= now() then 'overdue'
    when vb.notes ~* 'อุบัติ|accident|crash|ชน' then 'at_risk'
    when vb.ends_at <= now() + interval '45 minutes' then 'at_risk'
    when vb.starts_at > now() then 'pending'
    else 'in_progress'
  end
`;

export const PRIORITY_CASE = `
  case derived_status
    when 'overdue' then 1
    when 'at_risk' then 2
    when 'in_progress' then 3
    when 'pending' then 4
    when 'completed' then 8
    else 9
  end
`;

export const VALID_DERIVED_STATUSES = new Set([
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'cancelled',
  'at_risk',
]);

export type DashboardReportFilterParams = {
  fromIso: string;
  toIso: string;
  ownerId?: string | null;
  vehicleId?: string | null;
  search?: string | null;
};

/** ตัวกรองร่วมของ 3 รายงาน (work_queue / vehicle_usage / employee_hours) — ต้องเรียกซ้ำสำหรับ query หลักและ count query แต่ละครั้งเพื่อให้ index parameter ตรงกัน */
export function buildScoredBookingsFrom(p: DashboardReportFilterParams): { sql: string; params: unknown[] } {
  const tbl = tableInAppSchema('vehicle_bookings');
  const tblE = tableInAppSchema('employees');
  const tblV = tableInAppSchema('vehicles');

  const params: unknown[] = [p.fromIso, p.toIso];
  const clauses = [`vb.starts_at < $2::timestamptz`, `coalesce(vb.completed_at, vb.ends_at) > $1::timestamptz`];

  if (p.ownerId) {
    params.push(p.ownerId);
    clauses.push(`vb.employee_id = $${params.length}::uuid`);
  }
  if (p.vehicleId) {
    params.push(p.vehicleId);
    clauses.push(`vb.vehicle_id = $${params.length}::uuid`);
  }
  if (p.search) {
    const escaped = p.search.replace(/[\\%_]/g, (m) => `\\${m}`);
    params.push(`%${escaped}%`);
    const idx = `$${params.length}`;
    clauses.push(
      `(vb.work_order_no ILIKE ${idx} ESCAPE '\\' OR vb.destination ILIKE ${idx} ESCAPE '\\' OR vb.document_no ILIKE ${idx} ESCAPE '\\' OR e.first_name ILIKE ${idx} ESCAPE '\\' OR e.last_name ILIKE ${idx} ESCAPE '\\' OR v.plate_no ILIKE ${idx} ESCAPE '\\' OR v.label ILIKE ${idx} ESCAPE '\\')`,
    );
  }

  const sql = `
    from ${tbl} vb
    left join ${tblE} e on e.id = vb.employee_id
    left join ${tblV} v on v.id = vb.vehicle_id
    where ${clauses.join(' and ')}
  `;
  return { sql, params };
}
