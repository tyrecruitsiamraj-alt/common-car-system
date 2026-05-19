import { addDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import type {
  BookingListStatus,
  DashboardBookingRow,
  DashboardMetric,
  DashboardVehicleUsage,
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

/** สถานะจองในรายการ: กำลังใช้งาน หรือ เสร็จสิ้น เท่านั้น */
export function deriveBookingListStatus(
  b: VehicleBooking,
  now = new Date(),
): Exclude<BookingListStatus, 'all'> {
  const end = parseISO(b.ends_at);
  if (end <= now) return 'completed';
  return 'inProgress';
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
  const shortId = b.id.slice(0, 8).toUpperCase();
  const dest = (b.destination || '').trim();
  const note = (b.notes || '').trim();
  const route = dest || note || '—';
  let priority = 'ปกติ';
  if (/อุบัติ|accident/i.test(note)) priority = 'ด่วน';
  else if (/vip/i.test(note)) priority = 'VIP';

  return {
    id: `BK-${shortId}`,
    rawId: b.id,
    requester: empLabel(b.employee_id),
    department: emp?.position?.trim() || 'ผู้ขับ',
    route,
    car: (() => {
      const v = vehMap.get(b.vehicle_id);
      if (!v) return vehLabel(b.vehicle_id);
      return v.label?.trim() ? `${v.label.trim()} • ${v.plate_no}` : v.plate_no;
    })(),
    driver: empLabel(b.employee_id),
    date: formatBookingDateLabel(b.starts_at),
    time: `${format(parseISO(b.starts_at), 'HH:mm')} - ${format(parseISO(b.ends_at), 'HH:mm')}`,
    status: deriveBookingListStatus(b),
    priority,
  };
}

export function bookingsOnDay(bookings: VehicleBooking[], day: Date): VehicleBooking[] {
  const d0 = startOfDay(day);
  const d1 = addDays(d0, 1);
  return bookings.filter((b) => {
    const s = parseISO(b.starts_at);
    const e = parseISO(b.ends_at);
    return s < d1 && e > d0;
  });
}

export function buildTodayBookingDetails(
  bookings: VehicleBooking[],
  empLabel: (id: string) => string,
  vehMap: Map<string, Vehicle>,
): TodayBookingDetail[] {
  const today = bookingsOnDay(bookings, new Date());
  const now = new Date();
  return today
    .map((b) => {
      const v = vehMap.get(b.vehicle_id);
      const dest = (b.destination || '').trim();
      const note = (b.notes || '').trim();
      return {
        id: b.id,
        driverName: empLabel(b.employee_id),
        plate: v?.plate_no ?? '—',
        vehicleLabel: v?.label?.trim() || '—',
        time: `${format(parseISO(b.starts_at), 'HH:mm')} - ${format(parseISO(b.ends_at), 'HH:mm')}`,
        destination: dest || note || '—',
        status: deriveBookingListStatus(b, now),
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time, 'th'));
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
    },
    {
      id: 'completed',
      icon: CheckCircle2,
      label: 'เสร็จสิ้น',
      value: String(completed),
      helper: 'งาน',
    },
    {
      id: 'maintenance',
      icon: Wrench,
      label: 'รถซ่อมบำรุง',
      value: String(maintenance),
      helper: 'คัน',
    },
  ];
}

export function computeTopVehicles(
  bookings: VehicleBooking[],
  vehMap: Map<string, Vehicle>,
  max = 3,
): DashboardVehicleUsage[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    counts.set(b.vehicle_id, (counts.get(b.vehicle_id) ?? 0) + 1);
  }
  const maxCount = Math.max(1, ...counts.values());
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([vehId, count]) => {
      const v = vehMap.get(vehId);
      return {
        name: v?.label?.trim() || 'รถ',
        plate: v?.plate_no ?? '?',
        value: Math.round((count / maxCount) * 100),
        label: `${count} ครั้ง`,
      };
    });
}

export function computeUtilization(
  bookings: VehicleBooking[],
  vehicles: Vehicle[],
): { pct: number; summary: string } {
  const activeVehicles = vehicles.filter((v) => v.is_active !== false);
  const usedIds = new Set(bookings.map((b) => b.vehicle_id));
  const usedCount = activeVehicles.filter((v) => usedIds.has(v.id)).length;
  const total = activeVehicles.length || 1;
  const pct = Math.round((usedCount / total) * 100);
  const summary =
    total > 0
      ? `วันนี้มีรถพร้อมใช้งาน ${activeVehicles.length - usedCount} คัน จากทั้งหมด ${activeVehicles.length} คัน — จัดสรรรถให้เส้นทางในเมืองเพื่อใช้งานคุ้มค่า`
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
    const text = `${row.id} ${row.requester} ${row.department} ${row.route} ${row.car} ${row.driver}`.toLowerCase();
    return text.includes(q);
  });
}
