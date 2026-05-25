import { addDays, addMinutes, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatThaiDate, formatThaiTimeRange } from '@/lib/thaiDateTimeFormat';
import type {
  BookingListStatus,
  DashboardBookingRow,
  DashboardMetric,
} from '@/components/fleet/FleetBookingsDashboard';
import type { Employee, Vehicle, VehicleBooking } from '@/types';
import { Ban, CalendarDays, CheckCircle2, Clock3, Wrench } from 'lucide-react';

export type DashboardMetricId = 'today' | 'inProgress' | 'completed' | 'cancelled' | 'maintenance';

export function isBookingActive(b: VehicleBooking): boolean {
  return b.status !== 'cancelled';
}

export type TodayBookingDetail = {
  id: string;
  driverName: string;
  plate: string;
  vehicleLabel: string;
  time: string;
  destination: string;
  status: Exclude<BookingListStatus, 'all'>;
};

/** เวลาสิ้นสุดจริงของการจอง (กดเสร็จสิ้นแล้ว หรือตาม ends_at) */
export function bookingEffectiveEnd(b: VehicleBooking): Date {
  if (b.completed_at) return parseISO(b.completed_at);
  return parseISO(b.ends_at);
}

/** สถานะจอง: เสร็จสิ้นเมื่อกดเสร็จสิ้นเท่านั้น — ยังไม่กดจะค้างกำลังดำเนินการ */
export function deriveBookingListStatus(
  b: VehicleBooking,
): Exclude<BookingListStatus, 'all'> {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.completed_at) return 'completed';
  return 'inProgress';
}

export function isBookingInProgress(b: VehicleBooking): boolean {
  return isBookingActive(b) && deriveBookingListStatus(b) === 'inProgress';
}

/** เลยเวลาสิ้นสุดที่จองไว้แล้ว แต่ยังไม่กดเสร็จสิ้น — ใช้แจ้งเตือน */
export function isBookingOverdueNotCompleted(b: VehicleBooking, now = new Date()): boolean {
  if (b.status === 'cancelled' || b.completed_at) return false;
  const end = parseISO(b.ends_at);
  if (Number.isNaN(end.getTime())) return false;
  return end <= now;
}

function formatBookingDateLabel(startsAt: string): string {
  const d = parseISO(startsAt);
  const today = startOfDay(new Date());
  if (isSameDay(d, today)) return 'วันนี้';
  if (isSameDay(d, addDays(today, 1))) return 'พรุ่งนี้';
  return formatThaiDate(d);
}

export function bookingToDashboardRow(
  b: VehicleBooking,
  empLabel: (id: string) => string,
  vehLabel: (id: string) => string,
  empMap: Map<string, Employee>,
  vehMap: Map<string, Vehicle>,
): DashboardBookingRow {
  const emp = empMap.get(b.employee_id);
  const v = vehMap.get(b.vehicle_id);
  const shortId = b.id.slice(0, 8).toUpperCase();
  const dest = (b.destination || '').trim();
  const note = (b.notes || '').trim();
  const route = dest || note || '—';
  const vehicleName = v?.label?.trim() || vehLabel(b.vehicle_id);
  const plate = v?.plate_no ?? '—';
  const subtitleParts: string[] = [];
  if (dest && note && note !== dest) subtitleParts.push(note.slice(0, 48));
  else if (/vip/i.test(note)) subtitleParts.push('VIP');
  else if (/อุบัติ|accident/i.test(note)) subtitleParts.push('ด่วน');

  return {
    id: `BK-${shortId}`,
    rawId: b.id,
    requester: empLabel(b.employee_id),
    department: emp?.position?.trim() || 'ผู้ขับ',
    route,
    vehicleName,
    plate,
    driver: empLabel(b.employee_id),
    date: formatBookingDateLabel(b.starts_at),
    time: formatThaiTimeRange(b.starts_at, bookingEffectiveEnd(b)),
    status: deriveBookingListStatus(b),
    subtitle: subtitleParts.join(' · ') || route,
  };
}

export function bookingsOnDay(bookings: VehicleBooking[], day: Date): VehicleBooking[] {
  const d0 = startOfDay(day);
  const d1 = addDays(d0, 1);
  return bookings.filter((b) => {
    const s = parseISO(b.starts_at);
    const e = bookingEffectiveEnd(b);
    return s < d1 && e > d0;
  });
}

function bookingToDetailRow(
  b: VehicleBooking,
  empLabel: (id: string) => string,
  vehMap: Map<string, Vehicle>,
): TodayBookingDetail {
  const v = vehMap.get(b.vehicle_id);
  const dest = (b.destination || '').trim();
  const note = (b.notes || '').trim();
  return {
    id: b.id,
    driverName: empLabel(b.employee_id),
    plate: v?.plate_no ?? '—',
    vehicleLabel: v?.label?.trim() || '—',
    time: formatThaiTimeRange(b.starts_at, bookingEffectiveEnd(b)),
    destination: dest || note || '—',
    status: deriveBookingListStatus(b),
  };
}

export function buildTodayBookingDetails(
  bookings: VehicleBooking[],
  empLabel: (id: string) => string,
  vehMap: Map<string, Vehicle>,
  day: Date = new Date(),
): TodayBookingDetail[] {
  const onDay = bookingsOnDay(bookings, day);
  return onDay
    .map((b) => bookingToDetailRow(b, empLabel, vehMap))
    .sort((a, b) => a.time.localeCompare(b.time, 'th'));
}

export function buildTodayBookingsByStatus(
  bookings: VehicleBooking[],
  status: 'inProgress' | 'completed' | 'cancelled',
  empLabel: (id: string) => string,
  vehMap: Map<string, Vehicle>,
  day: Date = new Date(),
): TodayBookingDetail[] {
  const onDay = bookingsOnDay(bookings, day);
  return onDay
    .filter((b) => deriveBookingListStatus(b) === status)
    .map((b) => bookingToDetailRow(b, empLabel, vehMap))
    .sort((a, b) => a.time.localeCompare(b.time, 'th'));
}

export type MaintenanceVehicleDetail = {
  id: string;
  plate: string;
  label: string;
};

export function buildMaintenanceVehicleDetails(vehicles: Vehicle[]): MaintenanceVehicleDetail[] {
  return vehicles
    .filter((v) => v.is_active === false)
    .map((v) => ({
      id: v.id,
      plate: v.plate_no,
      label: v.label?.trim() || '—',
    }))
    .sort((a, b) => a.plate.localeCompare(b.plate, 'th'));
}

export function computeTodaySummaryCounts(
  bookings: VehicleBooking[],
  day: Date = new Date(),
): { inProgress: number; completed: number; cancelled: number } {
  const onDay = bookingsOnDay(bookings, day);
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  for (const b of onDay) {
    const st = deriveBookingListStatus(b);
    if (st === 'cancelled') cancelled += 1;
    else if (st === 'completed') completed += 1;
    else inProgress += 1;
  }
  return { inProgress, completed, cancelled };
}

export function computeDashboardMetrics(
  bookings: VehicleBooking[],
  vehicles: Vehicle[],
  day: Date = new Date(),
): DashboardMetric[] {
  const onDay = bookingsOnDay(bookings, day);
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;
  for (const b of onDay) {
    const st = deriveBookingListStatus(b);
    if (st === 'cancelled') cancelled += 1;
    else if (st === 'completed') completed += 1;
    else inProgress += 1;
  }
  const maintenance = vehicles.filter((v) => v.is_active === false).length;
  const dayBookingLabel = isSameDay(day, new Date()) ? "Today's bookings" : 'Selected day';
  const activeOnDay = onDay.length - cancelled;

  return [
    {
      id: 'today',
      icon: CalendarDays,
      label: dayBookingLabel,
      value: String(activeOnDay),
      helper: 'bookings',
      clickable: true,
    },
    {
      id: 'inProgress',
      icon: Clock3,
      label: 'In progress',
      value: String(inProgress),
      helper: 'bookings',
      clickable: true,
    },
    {
      id: 'completed',
      icon: CheckCircle2,
      label: 'Completed',
      value: String(completed),
      helper: 'bookings',
      clickable: true,
    },
    {
      id: 'cancelled',
      icon: Ban,
      label: 'Cancelled',
      value: String(cancelled),
      helper: 'bookings',
      clickable: true,
    },
    {
      id: 'maintenance',
      icon: Wrench,
      label: 'Maintenance',
      value: String(maintenance),
      helper: 'vehicles',
      clickable: true,
    },
  ];
}

export function computeUtilization(
  bookings: VehicleBooking[],
  vehicles: Vehicle[],
  day: Date = new Date(),
): { pct: number; summary: string } {
  const activeVehicles = vehicles.filter((v) => v.is_active !== false);
  const onDay = bookingsOnDay(bookings, day);
  const usedIds = new Set(onDay.filter((b) => isBookingInProgress(b)).map((b) => b.vehicle_id));
  const usedCount = activeVehicles.filter((v) => usedIds.has(v.id)).length;
  const total = activeVehicles.length || 1;
  const pct = Math.round((usedCount / total) * 100);
  const dayWord = isSameDay(day, new Date()) ? 'วันนี้' : 'วันที่เลือก';
  const summary =
    total > 0
      ? `${dayWord}มีรถพร้อมใช้งาน ${activeVehicles.length - usedCount} คัน จากทั้งหมด ${activeVehicles.length} คัน`
      : 'ยังไม่มีรถในระบบ';
  return { pct, summary };
}

export function filterDashboardBookings(
  rows: DashboardBookingRow[],
  query: string,
  statusFilter: BookingListStatus,
): DashboardBookingRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
    if (!matchesStatus) return false;
    if (!q) return true;
    const text =
      `${row.id} ${row.requester} ${row.department} ${row.route} ${row.vehicleName} ${row.plate} ${row.driver}`.toLowerCase();
    return text.includes(q);
  });
}

/** คำนวณ ends_at หลังกดเสร็จสิ้น */
export function endsAtForMarkComplete(b: VehicleBooking, now = new Date()): string {
  const start = parseISO(b.starts_at);
  let end = now > start ? now : addMinutes(start, 1);
  const planned = parseISO(b.ends_at);
  if (planned < end) end = planned;
  return end.toISOString();
}
