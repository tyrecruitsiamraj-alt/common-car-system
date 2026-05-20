import { addDays, addMinutes, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import type {
  BookingListStatus,
  DashboardBookingRow,
  DashboardMetric,
} from '@/components/fleet/FleetBookingsDashboard';
import type { Employee, Vehicle, VehicleBooking } from '@/types';
import { CalendarDays, CheckCircle2, Clock3, Wrench } from 'lucide-react';

export type DashboardMetricId = 'today' | 'inProgress' | 'completed' | 'maintenance';

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

/** สถานะจอง: กำลังดำเนินการ หรือ เสร็จสิ้น เท่านั้น */
export function deriveBookingListStatus(
  b: VehicleBooking,
  now = new Date(),
): Exclude<BookingListStatus, 'all'> {
  if (b.completed_at) return 'completed';
  if (bookingEffectiveEnd(b) <= now) return 'completed';
  return 'inProgress';
}

export function isBookingInProgress(b: VehicleBooking, now = new Date()): boolean {
  return deriveBookingListStatus(b, now) === 'inProgress';
}

function formatBookingDateLabel(startsAt: string): string {
  const d = parseISO(startsAt);
  const today = startOfDay(new Date());
  if (isSameDay(d, today)) return 'วันนี้';
  if (isSameDay(d, addDays(today, 1))) return 'พรุ่งนี้';
  return format(d, 'd MMM', { locale: th });
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
    time: `${format(parseISO(b.starts_at), 'HH:mm')} - ${format(bookingEffectiveEnd(b), 'HH:mm')}`,
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
  now: Date,
): TodayBookingDetail {
  const v = vehMap.get(b.vehicle_id);
  const dest = (b.destination || '').trim();
  const note = (b.notes || '').trim();
  return {
    id: b.id,
    driverName: empLabel(b.employee_id),
    plate: v?.plate_no ?? '—',
    vehicleLabel: v?.label?.trim() || '—',
    time: `${format(parseISO(b.starts_at), 'HH:mm')} - ${format(bookingEffectiveEnd(b), 'HH:mm')}`,
    destination: dest || note || '—',
    status: deriveBookingListStatus(b, now),
  };
}

export function buildTodayBookingDetails(
  bookings: VehicleBooking[],
  empLabel: (id: string) => string,
  vehMap: Map<string, Vehicle>,
): TodayBookingDetail[] {
  const today = bookingsOnDay(bookings, new Date());
  const now = new Date();
  return today
    .map((b) => bookingToDetailRow(b, empLabel, vehMap, now))
    .sort((a, b) => a.time.localeCompare(b.time, 'th'));
}

export function buildTodayBookingsByStatus(
  bookings: VehicleBooking[],
  status: 'inProgress' | 'completed',
  empLabel: (id: string) => string,
  vehMap: Map<string, Vehicle>,
): TodayBookingDetail[] {
  const today = bookingsOnDay(bookings, new Date());
  const now = new Date();
  return today
    .filter((b) => deriveBookingListStatus(b, now) === status)
    .map((b) => bookingToDetailRow(b, empLabel, vehMap, now))
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
  now = new Date(),
): { inProgress: number; completed: number } {
  const today = bookingsOnDay(bookings, now);
  let inProgress = 0;
  let completed = 0;
  for (const b of today) {
    const st = deriveBookingListStatus(b, now);
    if (st === 'completed') completed += 1;
    else inProgress += 1;
  }
  return { inProgress, completed };
}

export function computeDashboardMetrics(
  bookings: VehicleBooking[],
  vehicles: Vehicle[],
): DashboardMetric[] {
  const today = bookingsOnDay(bookings, new Date());
  const now = new Date();
  let inProgress = 0;
  let completed = 0;
  for (const b of today) {
    const st = deriveBookingListStatus(b, now);
    if (st === 'completed') completed += 1;
    else inProgress += 1;
  }
  const maintenance = vehicles.filter((v) => v.is_active === false).length;

  return [
    {
      id: 'today',
      icon: CalendarDays,
      label: 'จองวันนี้',
      value: String(today.length),
      helper: 'รายการ',
      clickable: true,
    },
    {
      id: 'inProgress',
      icon: Clock3,
      label: 'กำลังดำเนินการ',
      value: String(inProgress),
      helper: 'งาน',
      clickable: true,
    },
    {
      id: 'completed',
      icon: CheckCircle2,
      label: 'เสร็จสิ้น',
      value: String(completed),
      helper: 'งาน',
      clickable: true,
    },
    {
      id: 'maintenance',
      icon: Wrench,
      label: 'รถซ่อมบำรุง',
      value: String(maintenance),
      helper: 'คัน',
      clickable: true,
    },
  ];
}

export function computeUtilization(
  bookings: VehicleBooking[],
  vehicles: Vehicle[],
): { pct: number; summary: string } {
  const activeVehicles = vehicles.filter((v) => v.is_active !== false);
  const now = new Date();
  const usedIds = new Set(
    bookings.filter((b) => isBookingInProgress(b, now)).map((b) => b.vehicle_id),
  );
  const usedCount = activeVehicles.filter((v) => usedIds.has(v.id)).length;
  const total = activeVehicles.length || 1;
  const pct = Math.round((usedCount / total) * 100);
  const summary =
    total > 0
      ? `วันนี้มีรถพร้อมใช้งาน ${activeVehicles.length - usedCount} คัน จากทั้งหมด ${activeVehicles.length} คัน`
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
