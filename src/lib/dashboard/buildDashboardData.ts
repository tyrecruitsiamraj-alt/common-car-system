import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { formatBookingWorkOrderNo } from '@/lib/bookingWorkOrder';
import {
  bookingEffectiveEnd,
  deriveBookingListStatus,
  isBookingOverdueNotCompleted,
} from '@/lib/fleetBookingsDashboard';
import { bookingsInRange, type DashboardPeriodRange } from '@/lib/fleetDashboardStats';
import type {
  DashboardCancelReasonSlice,
  DashboardData,
  DashboardDriverSlice,
  DashboardFilters,
  DashboardJobTypeSlice,
  DashboardKpi,
  DashboardSlaStatus,
  DashboardStatusSlice,
  DashboardTaskStatus,
  DashboardTrendPoint,
  DashboardWorkItem,
} from '@/lib/dashboard/types';
import { BOOKING_CANCEL_REASON_LABELS, BOOKING_JOB_TYPE_LABELS } from '@/lib/bookingUiMessages';
import type {
  Employee,
  Vehicle,
  VehicleBooking,
  VehicleBookingCancelReason,
  VehicleBookingJobType,
} from '@/types';

const STATUS_LABELS: Record<DashboardTaskStatus, string> = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  completed: 'สำเร็จ',
  overdue: 'ล่าช้า',
  cancelled: 'ยกเลิก',
  at_risk: 'เสี่ยง',
};

function isIncidentBooking(b: VehicleBooking): boolean {
  const n = (b.notes || '').trim();
  return /อุบัติ|อุบัติเหตุ|accident|crash|ชน/i.test(n);
}

function isAtRiskBooking(b: VehicleBooking, now = new Date()): boolean {
  if (b.status === 'cancelled' || b.completed_at) return false;
  if (isIncidentBooking(b)) return true;
  const end = parseISO(b.ends_at);
  if (Number.isNaN(end.getTime())) return false;
  const minsLeft = (end.getTime() - now.getTime()) / 60_000;
  return minsLeft >= 0 && minsLeft <= 45;
}

function mapTaskStatus(b: VehicleBooking, now = new Date()): DashboardTaskStatus {
  const base = deriveBookingListStatus(b);
  if (base === 'cancelled') return 'cancelled';
  if (base === 'completed') return 'completed';
  if (isBookingOverdueNotCompleted(b, now)) return 'overdue';
  if (isAtRiskBooking(b, now)) return 'at_risk';
  const start = parseISO(b.starts_at);
  if (!Number.isNaN(start.getTime()) && start > now) return 'pending';
  return 'in_progress';
}

function mapSlaStatus(status: DashboardTaskStatus): DashboardSlaStatus {
  if (status === 'overdue') return 'breached';
  if (status === 'at_risk') return 'at_risk';
  if (status === 'cancelled') return 'on_track';
  return 'on_track';
}

function nextActionFor(status: DashboardTaskStatus): string {
  if (status === 'overdue') return 'ติดตามปิดงานด่วน';
  if (status === 'at_risk') return 'ติดตามความเสี่ยง';
  if (status === 'in_progress' || status === 'pending') return 'ตรวจสอบความคืบหน้า';
  if (status === 'completed') return '—';
  return '—';
}

function priorityFor(status: DashboardTaskStatus): number {
  if (status === 'overdue') return 1;
  if (status === 'at_risk') return 2;
  if (status === 'in_progress') return 3;
  if (status === 'pending') return 4;
  if (status === 'completed') return 8;
  return 9;
}

function empName(employees: Employee[], id: string): string {
  const e = employees.find((x) => x.id === id);
  return e ? `${e.first_name} ${e.last_name}`.trim() || e.employee_code : id.slice(0, 8);
}

function vehInfo(vehicles: Vehicle[], id: string): { plate: string; label: string } {
  const v = vehicles.find((x) => x.id === id);
  return { plate: v?.plate_no?.trim() || '—', label: v?.label?.trim() || '—' };
}

export function bookingToWorkItem(
  b: VehicleBooking,
  employees: Employee[],
  vehicles: Vehicle[],
  now = new Date(),
): DashboardWorkItem {
  const status = mapTaskStatus(b, now);
  const veh = vehInfo(vehicles, b.vehicle_id);
  const dest = (b.destination || '').trim();
  const doc = (b.document_no || '').trim();
  return {
    id: b.id,
    workOrderNo: formatBookingWorkOrderNo(b),
    title: dest || doc || 'งานขนส่ง/ขับรถ',
    ownerId: b.employee_id,
    ownerName: empName(employees, b.employee_id),
    vehiclePlate: veh.plate,
    vehicleLabel: veh.label,
    department: doc || 'ทั่วไป',
    site: dest || '—',
    jobType: b.job_type ?? null,
    cancelReason: b.cancel_reason ?? null,
    status,
    slaStatus: mapSlaStatus(status),
    createdAt: b.created_at,
    updatedAt: b.completed_at || b.ends_at || b.created_at,
    nextAction: nextActionFor(status),
    priority: priorityFor(status),
  };
}

function previousRange(range: DashboardPeriodRange): DashboardPeriodRange {
  const days = Math.max(1, differenceInCalendarDays(range.to, range.from) + 1);
  const to = endOfDay(subDays(range.from, 1));
  const from = startOfDay(subDays(to, days - 1));
  return { from, to, label: 'ช่วงก่อนหน้า' };
}

function trendDirection(current: number, previous: number): 'up' | 'down' | 'neutral' {
  if (previous === 0) return current > 0 ? 'up' : 'neutral';
  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 0.5) return 'neutral';
  return delta > 0 ? 'up' : 'down';
}

function trendValue(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(Math.abs(((current - previous) / previous) * 100) * 10) / 10;
}

function countByStatus(items: DashboardWorkItem[], status: DashboardTaskStatus): number {
  return items.filter((i) => i.status === status).length;
}

function buildKpis(
  current: DashboardWorkItem[],
  previous: DashboardWorkItem[],
): DashboardKpi[] {
  const total = current.length;
  const prevTotal = previous.length;
  const pending = countByStatus(current, 'pending') + countByStatus(current, 'in_progress');
  const prevPending =
    countByStatus(previous, 'pending') + countByStatus(previous, 'in_progress');
  const overdue = countByStatus(current, 'overdue');
  const prevOverdue = countByStatus(previous, 'overdue');
  const completed = countByStatus(current, 'completed');
  const prevCompleted = countByStatus(previous, 'completed');
  const active = total - countByStatus(current, 'cancelled');
  const prevActive = prevTotal - countByStatus(previous, 'cancelled');
  const rate = active > 0 ? Math.round((completed / active) * 100) : 0;
  const prevRate = prevActive > 0 ? Math.round((prevCompleted / prevActive) * 100) : 0;

  const mkTrend = (cur: number, prev: number, invert = false) => {
    const dir = trendDirection(cur, prev);
    const adjusted =
      invert && dir !== 'neutral' ? (dir === 'up' ? 'down' : 'up') : dir;
    return {
      value: trendValue(cur, prev),
      label: 'เทียบช่วงก่อน',
      direction: adjusted as 'up' | 'down' | 'neutral',
    };
  };

  return [
    {
      id: 'total',
      label: 'งานทั้งหมด',
      value: String(total),
      hint: 'ใบจองในช่วงที่เลือก',
      trend: mkTrend(total, prevTotal),
    },
    {
      id: 'pending',
      label: 'รอดำเนินการ',
      value: String(pending),
      hint: 'รอเริ่ม + กำลังดำเนินการ',
      trend: mkTrend(pending, prevPending, true),
    },
    {
      id: 'overdue',
      label: 'ล่าช้า',
      value: String(overdue),
      hint: 'เลยเวลาและยังไม่ปิดงาน',
      trend: mkTrend(overdue, prevOverdue, true),
    },
    {
      id: 'completed',
      label: 'สำเร็จ',
      value: String(completed),
      hint: 'ปิดงานแล้ว',
      trend: mkTrend(completed, prevCompleted),
    },
    {
      id: 'success_rate',
      label: 'อัตราสำเร็จ',
      value: `${rate}%`,
      hint: 'สำเร็จ / งานที่ไม่ถูกยกเลิก',
      trend: mkTrend(rate, prevRate),
    },
  ];
}

function buildTrendSeries(
  bookings: VehicleBooking[],
  range: DashboardPeriodRange,
  previousBookings: VehicleBooking[],
): DashboardTrendPoint[] {
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  const prevDays = eachDayOfInterval({
    start: previousRange(range).from,
    end: previousRange(range).to,
  });

  const countOnDay = (list: VehicleBooking[], day: Date) =>
    list.filter((b) => {
      const s = parseISO(b.starts_at);
      return isWithinInterval(s, { start: startOfDay(day), end: endOfDay(day) });
    }).length;

  return days.map((day, i) => {
    const prevDay = prevDays[i] ?? prevDays[prevDays.length - 1];
    return {
      label: format(day, 'EEE', { locale: th }),
      value: countOnDay(bookings, day),
      previousValue: prevDay ? countOnDay(previousBookings, prevDay) : 0,
    };
  });
}

function buildStatusSlices(items: DashboardWorkItem[]): DashboardStatusSlice[] {
  const total = items.length || 1;
  const order: DashboardTaskStatus[] = [
    'completed',
    'in_progress',
    'pending',
    'overdue',
    'at_risk',
    'cancelled',
  ];
  return order
    .map((status) => {
      const count = countByStatus(items, status);
      return {
        status,
        label: STATUS_LABELS[status],
        count,
        share: Math.round((count / total) * 100),
      };
    })
    .filter((s) => s.count > 0);
}

const JOB_TYPE_ORDER: VehicleBookingJobType[] = ['trip_sabuy', 'job_order', 'substitute', 'standby'];

function buildJobTypeSlices(items: DashboardWorkItem[]): DashboardJobTypeSlice[] {
  const total = items.length || 1;
  const counts = new Map<VehicleBookingJobType | 'unspecified', number>();
  for (const item of items) {
    const key = item.jobType ?? 'unspecified';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const order: (VehicleBookingJobType | 'unspecified')[] = [...JOB_TYPE_ORDER, 'unspecified'];
  return order
    .map((jobType) => {
      const count = counts.get(jobType) ?? 0;
      return {
        jobType,
        label: jobType === 'unspecified' ? 'ไม่ระบุ' : BOOKING_JOB_TYPE_LABELS[jobType],
        count,
        share: Math.round((count / total) * 100),
      };
    })
    .filter((s) => s.count > 0);
}

const CANCEL_REASON_ORDER: VehicleBookingCancelReason[] = ['user_not_using', 'employee_no_show'];

function buildCancelReasonSlices(items: DashboardWorkItem[]): DashboardCancelReasonSlice[] {
  const cancelled = items.filter((i) => i.status === 'cancelled');
  const total = cancelled.length || 1;
  const counts = new Map<VehicleBookingCancelReason | 'unspecified', number>();
  for (const item of cancelled) {
    const key = item.cancelReason ?? 'unspecified';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const order: (VehicleBookingCancelReason | 'unspecified')[] = [...CANCEL_REASON_ORDER, 'unspecified'];
  return order
    .map((cancelReason) => {
      const count = counts.get(cancelReason) ?? 0;
      return {
        cancelReason,
        label: cancelReason === 'unspecified' ? 'ไม่ระบุ' : BOOKING_CANCEL_REASON_LABELS[cancelReason],
        count,
        share: Math.round((count / total) * 100),
      };
    })
    .filter((s) => s.count > 0);
}

function buildDriverSlices(items: DashboardWorkItem[], employees: Employee[]): DashboardDriverSlice[] {
  const counts = new Map<string, { total: number; completed: number; overdue: number }>();
  for (const item of items) {
    const cur = counts.get(item.ownerId) ?? { total: 0, completed: 0, overdue: 0 };
    cur.total += 1;
    if (item.status === 'completed') cur.completed += 1;
    if (item.status === 'overdue') cur.overdue += 1;
    counts.set(item.ownerId, cur);
  }
  const grand = items.length || 1;
  return [...counts.entries()]
    .map(([id, stats]) => {
      const emp = employees.find((e) => e.id === id);
      return {
        id,
        name: emp ? `${emp.first_name} ${emp.last_name}`.trim() : id.slice(0, 8),
        subtitle: emp?.position?.trim() || 'ผู้ขับ',
        taskCount: stats.total,
        completedCount: stats.completed,
        overdueCount: stats.overdue,
        share: Math.round((stats.total / grand) * 100),
      };
    })
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 6);
}

export function applyDashboardFilters(
  items: DashboardWorkItem[],
  filters: DashboardFilters,
): DashboardWorkItem[] {
  const q = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.ownerId && item.ownerId !== filters.ownerId) return false;
    if (filters.vehicleId) {
      // vehicle id not on work item — match plate in search only at build time
    }
    if (!q) return true;
    const hay = `${item.workOrderNo} ${item.title} ${item.ownerName} ${item.vehiclePlate} ${item.site} ${item.department}`.toLowerCase();
    return hay.includes(q);
  });
}

export function buildDashboardData(
  bookings: VehicleBooking[],
  employees: Employee[],
  vehicles: Vehicle[],
  range: DashboardPeriodRange,
  filters: DashboardFilters,
): DashboardData {
  const now = new Date();
  const inRange = bookingsInRange(bookings, range.from, range.to);
  const prev = previousRange(range);
  const inPrevRange = bookingsInRange(bookings, prev.from, prev.to);

  const allItems = inRange.map((b) => bookingToWorkItem(b, employees, vehicles, now));
  const prevItems = inPrevRange.map((b) => bookingToWorkItem(b, employees, vehicles, now));

  let filtered = applyDashboardFilters(allItems, filters);
  if (filters.vehicleId) {
    const plate = vehicles.find((v) => v.id === filters.vehicleId)?.plate_no?.toLowerCase() ?? '';
    if (plate) {
      filtered = filtered.filter((i) => i.vehiclePlate.toLowerCase().includes(plate));
    }
  }

  return {
    periodLabel: range.label,
    generatedAt: now.toISOString(),
    kpis: buildKpis(filtered, prevItems),
    trendSeries: buildTrendSeries(inRange, range, inPrevRange),
    statusSlices: buildStatusSlices(filtered),
    jobTypeSlices: buildJobTypeSlices(filtered),
    cancelReasonSlices: buildCancelReasonSlices(filtered),
    driverSlices: buildDriverSlices(filtered, employees),
  };
}

export { STATUS_LABELS };
