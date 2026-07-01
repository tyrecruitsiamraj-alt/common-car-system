import {
  addDays,
  addHours,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parse,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { formatThaiDate, formatThaiTimeRange } from '@/lib/thaiDateTimeFormat';
import {
  bookingEffectiveEnd,
  computeTodaySummaryCounts,
  isBookingActive,
} from '@/lib/fleetBookingsDashboard';
import type { Employee, VehicleBooking } from '@/types';

export const DASHBOARD_PLANNER_START_HOUR = 8;
export const DASHBOARD_PLANNER_END_HOUR = 24;
export const DASHBOARD_PLANNER_HOURS = Array.from(
  { length: DASHBOARD_PLANNER_END_HOUR - DASHBOARD_PLANNER_START_HOUR },
  (_, i) => DASHBOARD_PLANNER_START_HOUR + i,
);

export type DashboardRankItem = { id: string; label: string; count: number; hours?: number };

export type DashboardPeriodPreset = 'this_week' | 'this_month' | 'last_week' | 'last_month' | 'custom';

export type DashboardPeriodRange = {
  from: Date;
  to: Date;
  label: string;
};

const WEEK_OPTS = { weekStartsOn: 1 as const };

export function parseDashboardYmd(ymd: string): Date {
  const d = parse(ymd, 'yyyy-MM-dd', new Date());
  return Number.isNaN(d.getTime()) ? startOfDay(new Date()) : startOfDay(d);
}

export function combineYmdHm(ymd: string, hm: string): Date {
  const day = parseDashboardYmd(ymd);
  const parts = (hm ?? '08:00').trim().slice(0, 5).split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return setMinutes(setHours(day, 8), 0);
  return setMinutes(setHours(day, Math.min(23, Math.max(0, h))), Math.min(59, Math.max(0, m)));
}

export function resolveDashboardPeriodRange(
  preset: DashboardPeriodPreset,
  customFromYmd?: string,
  customToYmd?: string,
  anchor = new Date(),
): DashboardPeriodRange {
  const today = startOfDay(anchor);
  if (preset === 'this_week') {
    const from = startOfWeek(today, WEEK_OPTS);
    const to = endOfWeek(today, WEEK_OPTS);
    return {
      from,
      to,
      label: `สัปดาห์นี้ (${formatThaiDate(from)} – ${formatThaiDate(to)})`,
    };
  }
  if (preset === 'last_week') {
    const ref = subWeeks(today, 1);
    const from = startOfWeek(ref, WEEK_OPTS);
    const to = endOfWeek(ref, WEEK_OPTS);
    return {
      from,
      to,
      label: `สัปดาห์ที่แล้ว (${formatThaiDate(from)} – ${formatThaiDate(to)})`,
    };
  }
  if (preset === 'this_month') {
    const from = startOfMonth(today);
    const to = endOfMonth(today);
    return {
      from,
      to,
      label: `เดือน${format(from, 'MMMM yyyy', { locale: th })}`,
    };
  }
  if (preset === 'last_month') {
    const ref = subMonths(today, 1);
    const from = startOfMonth(ref);
    const to = endOfMonth(ref);
    return {
      from,
      to,
      label: `เดือน${format(from, 'MMMM yyyy', { locale: th })} (ที่แล้ว)`,
    };
  }
  const from = customFromYmd ? parseDashboardYmd(customFromYmd) : startOfMonth(today);
  const toRaw = customToYmd ? parseDashboardYmd(customToYmd) : endOfMonth(today);
  const to = endOfDay(toRaw < from ? from : toRaw);
  return {
    from,
    to,
    label: `${formatThaiDate(from)} – ${formatThaiDate(to)}`,
  };
}

/** ช่วงโหลดจองสำหรับแท็บรายวัน — กันจองข้ามคืน */
export function dailyDashboardFetchRange(day: Date): { from: Date; to: Date } {
  return {
    from: startOfDay(addDays(day, -1)),
    to: endOfDay(addDays(day, 1)),
  };
}

export function bookingsOverlappingDay(bookings: VehicleBooking[], day: Date): VehicleBooking[] {
  const d0 = startOfDay(day);
  const d1 = endOfDay(day);
  return bookings
    .filter((b) => {
      const s = parseISO(b.starts_at);
      const e = bookingEffectiveEnd(b);
      return s < d1 && e > d0;
    })
    .sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime());
}

export function bookingsInRange(bookings: VehicleBooking[], from: Date, to: Date): VehicleBooking[] {
  return bookings.filter((b) => {
    const s = parseISO(b.starts_at);
    const e = bookingEffectiveEnd(b);
    return s < to && e > from;
  });
}

export function bookingOverlapsLocalHour(b: VehicleBooking, day: Date, hour: number): boolean {
  if (!isBookingActive(b)) return false;
  const slotStart = setMinutes(setHours(day, hour), 0);
  const slotEnd = addHours(slotStart, 1);
  const s = parseISO(b.starts_at);
  const e = bookingEffectiveEnd(b);
  return s < slotEnd && e > slotStart;
}

export function freeHourRangesOnLocalDay(
  bookings: VehicleBooking[],
  day: Date,
  matchBooking: (b: VehicleBooking) => boolean,
): { startH: number; endH: number }[] {
  const busy = Array.from({ length: 24 }, (_, h) =>
    bookings.some((b) => matchBooking(b) && bookingOverlapsLocalHour(b, day, h)),
  );
  const ranges: { startH: number; endH: number }[] = [];
  let i = 0;
  while (i < 24) {
    if (busy[i]) {
      i += 1;
      continue;
    }
    const start = i;
    while (i < 24 && !busy[i]) i += 1;
    ranges.push({ startH: start, endH: i });
  }
  return ranges;
}

export function formatLocalFreeHourRange(day: Date, startH: number, endH: number): string {
  const from = setMinutes(setHours(day, startH), 0);
  const to = endH >= 24 ? addHours(startOfDay(day), 24) : setMinutes(setHours(day, endH), 0);
  return formatThaiTimeRange(from, to);
}

export function bookingDurationHours(b: VehicleBooking): number {
  const ms = bookingEffectiveEnd(b).getTime() - parseISO(b.starts_at).getTime();
  return Math.max(0, ms / 3_600_000);
}

export function isIncidentBooking(b: VehicleBooking): boolean {
  const n = (b.notes || '').trim();
  return /อุบัติ|อุบัติเหตุ|accident|crash|ชน/i.test(n);
}

export function topByKey(
  bookings: VehicleBooking[],
  key: 'vehicle_id' | 'employee_id',
  limit: number,
  labelFor: (id: string) => string,
  options?: { includeHours?: boolean },
): DashboardRankItem[] {
  const counts = new Map<string, number>();
  const hours = new Map<string, number>();
  for (const b of bookings) {
    if (b.status === 'cancelled') continue;
    const id = b[key];
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (options?.includeHours) {
      hours.set(id, (hours.get(id) ?? 0) + bookingDurationHours(b));
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({
      id,
      label: labelFor(id),
      count,
      hours: options?.includeHours ? Math.round((hours.get(id) ?? 0) * 10) / 10 : undefined,
    }));
}

export type PeriodKpis = {
  totalBookings: number;
  cancelled: number;
  activeBookings: number;
  totalDriverHours: number;
};

export function computePeriodKpis(bookings: VehicleBooking[]): PeriodKpis {
  let cancelled = 0;
  let totalDriverHours = 0;
  for (const b of bookings) {
    if (b.status === 'cancelled') {
      cancelled += 1;
      continue;
    }
    totalDriverHours += bookingDurationHours(b);
  }
  return {
    totalBookings: bookings.length,
    cancelled,
    activeBookings: bookings.length - cancelled,
    totalDriverHours: Math.round(totalDriverHours * 10) / 10,
  };
}

export type DailyEmployeeSummary = {
  stats: { total: number; inUse: number; freeAllDay: number; partialFree: number };
  freeAllDayList: Employee[];
  partialFreeList: { emp: Employee; ranges: { startH: number; endH: number; label: string }[] }[];
};

export function computeDailyEmployeeSummary(
  bookings: VehicleBooking[],
  employees: Employee[],
  day: Date,
): DailyEmployeeSummary {
  const onDay = bookingsOverlappingDay(bookings, day);
  const busyEmpIds = new Set<string>();
  for (const b of onDay) {
    if (!isBookingActive(b)) continue;
    busyEmpIds.add(b.employee_id);
  }
  const activeEmps = employees.filter((e) => e.status === 'active');
  const freeAllDayList = activeEmps
    .filter((e) => !busyEmpIds.has(e.id))
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'th'),
    );

  const partialFreeList: DailyEmployeeSummary['partialFreeList'] = [];
  for (const emp of activeEmps) {
    if (!busyEmpIds.has(emp.id)) continue;
    const ranges = freeHourRangesOnLocalDay(bookings, day, (b) => b.employee_id === emp.id);
    if (ranges.length === 0) continue;
    partialFreeList.push({
      emp,
      ranges: ranges.map((r) => ({
        ...r,
        label: formatLocalFreeHourRange(day, r.startH, r.endH),
      })),
    });
  }

  return {
    stats: {
      total: activeEmps.length,
      inUse: busyEmpIds.size,
      freeAllDay: freeAllDayList.length,
      partialFree: partialFreeList.length,
    },
    freeAllDayList,
    partialFreeList,
  };
}

export function formatDashboardDayLabel(day: Date): string {
  if (isSameDay(day, new Date())) return 'วันนี้';
  return formatThaiDate(day);
}

export { computeTodaySummaryCounts };
