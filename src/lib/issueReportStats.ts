import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, format } from 'date-fns';
import type {
  PeriodKey,
  BreakdownItem,
  PersonCaseSummary,
  VehicleServiceData,
  SupervisorAbsentData,
  LeaveData,
  SpeedData,
  ComplaintsOverviewData,
} from './complaintsOverviewMockData';

export type IssueReportRow = {
  id: string;
  category: string;
  report_date?: string;
  employee_id?: string;
  employee_name?: string;
  position?: string;
  reporter_name?: string;
  reporter_phone?: string;
  data: Record<string, string>;
  created_at: string;
};

function periodBounds(period: PeriodKey, now: Date): { fromYmd: string; toYmd: string } {
  const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (period) {
    case 'day':
      return { fromYmd: ymd(startOfDay(now)), toYmd: ymd(endOfDay(now)) };
    case 'week':
      return { fromYmd: ymd(startOfWeek(now, { weekStartsOn: 1 })), toYmd: ymd(endOfWeek(now, { weekStartsOn: 1 })) };
    case 'year':
      return { fromYmd: ymd(startOfYear(now)), toYmd: ymd(endOfYear(now)) };
    case 'month':
    default:
      return { fromYmd: ymd(startOfMonth(now)), toYmd: ymd(endOfMonth(now)) };
  }
}

export function filterByPeriod(rows: IssueReportRow[], period: PeriodKey, now = new Date()): IssueReportRow[] {
  const { fromYmd, toYmd } = periodBounds(period, now);
  return rows.filter((r) => r.report_date && r.report_date >= fromYmd && r.report_date <= toYmd);
}

function countBy(rows: IssueReportRow[], pick: (r: IssueReportRow) => string | undefined): BreakdownItem[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const label = pick(r)?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

function peopleSummary(rows: IssueReportRow[], caseLabel: (r: IssueReportRow) => string): PersonCaseSummary[] {
  const byName = new Map<string, { position: string; cases: string[] }>();
  for (const r of rows) {
    const name = r.employee_name?.trim();
    if (!name) continue;
    const entry = byName.get(name) ?? { position: r.position ?? '-', cases: [] };
    entry.cases.push(caseLabel(r));
    byName.set(name, entry);
  }
  return [...byName.entries()]
    .map(([name, { position, cases }]) => ({ name, position, count: cases.length, cases }))
    .sort((a, b) => b.count - a.count);
}

function serviceTypeLabel(r: IssueReportRow): string | undefined {
  if (r.data.service_type === 'อื่นๆ') return r.data.service_type_other || 'อื่นๆ';
  return r.data.service_type;
}

export function daysInclusive(startYmd: string | undefined, endYmd: string | undefined): number {
  if (!startYmd || !endYmd) return 0;
  const start = new Date(startYmd);
  const end = new Date(endYmd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return diff > 0 ? diff : 0;
}

function computeVehicleService(rows: IssueReportRow[]): VehicleServiceData {
  return {
    total: rows.length,
    cancelled: rows.filter((r) => r.data.status === 'ยกเลิก').length,
    postponed: rows.filter((r) => r.data.status === 'เลื่อน').length,
    byModel: countBy(rows, (r) => r.data.vehicle_model),
    byCenter: countBy(rows, (r) => r.data.service_center),
    byServiceType: countBy(rows, serviceTypeLabel),
    people: peopleSummary(
      rows,
      (r) => `${serviceTypeLabel(r) ?? '-'} — ${r.data.vehicle_model ?? '-'}${r.data.vehicle_plate ? ` (${r.data.vehicle_plate})` : ''}`,
    ),
  };
}

/** จำนวนวันที่ใช้ได้จริง = จำนวนวันบินทั้งหมด หักวันที่บิน + วันที่กลับออก 2 วัน (2 วันนี้ไม่ว่าง) */
function usableDaysInclusive(startYmd: string | undefined, endYmd: string | undefined): number {
  const total = daysInclusive(startYmd, endYmd);
  return total > 0 ? Math.max(0, total - 2) : 0;
}

function computeSupervisorAbsent(rows: IssueReportRow[]): SupervisorAbsentData {
  const totalDaysAway = rows.reduce((sum, r) => sum + daysInclusive(r.data.start_date, r.data.end_date), 0);
  const totalUsableDays = rows.reduce((sum, r) => sum + usableDaysInclusive(r.data.start_date, r.data.end_date), 0);
  return {
    totalPeople: new Set(rows.map((r) => r.employee_name).filter(Boolean)).size,
    totalDaysAway,
    totalUsableDays,
    byStatus: countBy(rows, (r) => r.data.employee_status),
    people: peopleSummary(rows, (r) => `บิน ${daysInclusive(r.data.start_date, r.data.end_date)} วัน — ${r.data.cover_type ?? '-'}`),
  };
}

function leaveTypeLabel(r: IssueReportRow): string | undefined {
  if (r.data.leave_type === 'อื่นๆ') return r.data.leave_reason || 'อื่นๆ';
  return r.data.leave_type;
}

function computeLeave(rows: IssueReportRow[]): LeaveData {
  return {
    totalPeople: new Set(rows.map((r) => r.employee_name).filter(Boolean)).size,
    byLeaveType: countBy(rows, leaveTypeLabel),
    people: peopleSummary(rows, (r) => leaveTypeLabel(r) ?? '-'),
  };
}

function computeSpeed(rows: IssueReportRow[]): SpeedData {
  return {
    overLimitCount: rows.length,
    byRepeat: countBy(rows, (r) => r.data.repeat_status),
    byReason: countBy(rows, (r) => r.data.speed_reason),
    people: peopleSummary(rows, (r) => `${r.data.speed_over ?? '-'} — ${r.data.speed_reason ?? '-'}`),
  };
}

/** สรุปรายละเอียดของเคสเดียวเป็นข้อความสั้นๆ ตามหมวด — ใช้ในหน้าประวัติและ Export Excel */
export function summarizeIssueReportRow(row: IssueReportRow): string {
  switch (row.category) {
    case 'vehicle-service':
      return `${serviceTypeLabel(row) ?? '-'} — ${row.data.vehicle_model ?? '-'}${row.data.vehicle_plate ? ` (${row.data.vehicle_plate})` : ''} · ${row.data.status ?? '-'}`;
    case 'supervisor-absent':
      return `บิน ${daysInclusive(row.data.start_date, row.data.end_date)} วัน — ${row.data.cover_type ?? '-'}`;
    case 'leave':
      return leaveTypeLabel(row) ?? '-';
    case 'speed':
      return `${row.data.speed_over ?? '-'} — ${row.data.speed_reason ?? '-'}`;
    default:
      return '-';
  }
}

export function computeComplaintsOverview(
  allRows: IssueReportRow[],
  period: PeriodKey,
  now = new Date(),
): ComplaintsOverviewData {
  const byCategory = (cat: string) => filterByPeriod(allRows.filter((r) => r.category === cat), period, now);
  return {
    vehicleService: computeVehicleService(byCategory('vehicle-service')),
    supervisorAbsent: computeSupervisorAbsent(byCategory('supervisor-absent')),
    leave: computeLeave(byCategory('leave')),
    speed: computeSpeed(byCategory('speed')),
  };
}
