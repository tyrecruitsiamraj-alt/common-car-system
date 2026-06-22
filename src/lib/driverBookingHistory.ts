import { differenceInMinutes, parseISO } from 'date-fns';
import { bookingEffectiveEnd } from '@/lib/fleetBookingsDashboard';
import { BOOKING_STATUS_LABELS } from '@/lib/bookingUiMessages';
import type { Vehicle, VehicleBooking } from '@/types';

export type DriverBookingTiming = 'early' | 'late' | 'on_time' | 'in_progress' | 'cancelled';

export const DRIVER_BOOKING_TIMING_LABEL: Record<DriverBookingTiming, string> = {
  early: 'ก่อนเวลา',
  late: 'เกินเวลา',
  on_time: 'ตรงเวลา',
  in_progress: 'กำลังดำเนินการ',
  cancelled: BOOKING_STATUS_LABELS.cancelled,
};

export type DriverBookingRow = {
  booking: VehicleBooking;
  timing: DriverBookingTiming;
  destinationLabel: string;
  vehicleLabel: string;
};

export type DriverVehicleUsage = {
  vehicleId: string;
  label: string;
  tripCount: number;
  lastAt: string;
};

export type DriverDestinationStat = {
  destination: string;
  tripCount: number;
  lastAt: string;
};

function activeBookings(bookings: VehicleBooking[]): VehicleBooking[] {
  return bookings.filter((b) => b.status !== 'cancelled');
}

export function classifyBookingTiming(b: VehicleBooking, now = new Date()): DriverBookingTiming {
  if (b.status === 'cancelled') return 'cancelled';
  const plannedEnd = parseISO(b.ends_at);
  if (Number.isNaN(plannedEnd.getTime())) return 'in_progress';
  if (b.completed_at) {
    const done = parseISO(b.completed_at);
    if (Number.isNaN(done.getTime())) return 'on_time';
    if (done < plannedEnd) return 'early';
    if (done > plannedEnd) return 'late';
    return 'on_time';
  }
  if (plannedEnd <= now) return 'late';
  return 'in_progress';
}

export function countEarlyBookings(bookings: VehicleBooking[]): number {
  return activeBookings(bookings).filter((b) => classifyBookingTiming(b) === 'early').length;
}

export function countLateBookings(bookings: VehicleBooking[]): number {
  return activeBookings(bookings).filter((b) => {
    const t = classifyBookingTiming(b);
    return t === 'late';
  }).length;
}

export function buildDriverBookingRows(
  bookings: VehicleBooking[],
  vehMap: Map<string, Vehicle>,
  vehLabel: (id: string) => string,
): DriverBookingRow[] {
  return activeBookings(bookings)
    .slice()
    .sort((a, b) => parseISO(b.starts_at).getTime() - parseISO(a.starts_at).getTime())
    .map((booking) => {
      const dest = (booking.destination || '').trim();
      const note = (booking.notes || '').trim();
      return {
        booking,
        timing: classifyBookingTiming(booking),
        destinationLabel: dest || note || '—',
        vehicleLabel: vehMap.get(booking.vehicle_id)?.plate_no?.trim() || vehLabel(booking.vehicle_id),
      };
    });
}

export function buildDriverVehicleUsage(
  bookings: VehicleBooking[],
  vehMap: Map<string, Vehicle>,
  vehLabel: (id: string) => string,
): DriverVehicleUsage[] {
  const byVeh = new Map<string, { count: number; lastAt: string }>();
  for (const b of activeBookings(bookings)) {
    const cur = byVeh.get(b.vehicle_id) ?? { count: 0, lastAt: b.starts_at };
    cur.count += 1;
    if (parseISO(b.starts_at) >= parseISO(cur.lastAt)) cur.lastAt = b.starts_at;
    byVeh.set(b.vehicle_id, cur);
  }
  return [...byVeh.entries()]
    .map(([vehicleId, { count, lastAt }]) => ({
      vehicleId,
      label: vehMap.get(vehicleId)?.label?.trim()
        ? `${vehMap.get(vehicleId)!.plate_no} · ${vehMap.get(vehicleId)!.label!.trim()}`
        : vehMap.get(vehicleId)?.plate_no?.trim() || vehLabel(vehicleId),
      tripCount: count,
      lastAt,
    }))
    .sort((a, b) => b.tripCount - a.tripCount || b.lastAt.localeCompare(a.lastAt));
}

export function buildDriverDestinationStats(bookings: VehicleBooking[]): DriverDestinationStat[] {
  const byDest = new Map<string, { count: number; lastAt: string }>();
  for (const b of activeBookings(bookings)) {
    const dest = (b.destination || '').trim();
    const note = (b.notes || '').trim();
    const key = dest || note;
    if (!key) continue;
    const cur = byDest.get(key) ?? { count: 0, lastAt: b.starts_at };
    cur.count += 1;
    if (parseISO(b.starts_at) >= parseISO(cur.lastAt)) cur.lastAt = b.starts_at;
    byDest.set(key, cur);
  }
  return [...byDest.entries()]
    .map(([destination, { count, lastAt }]) => ({ destination, tripCount: count, lastAt }))
    .sort((a, b) => b.tripCount - a.tripCount || b.lastAt.localeCompare(a.lastAt));
}

/** ระยะเวลาจริงของงาน (นาที) — ใช้ completed_at ถ้ามี */
export function bookingDurationMinutes(b: VehicleBooking): number {
  const start = parseISO(b.starts_at);
  const end = bookingEffectiveEnd(b);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, differenceInMinutes(end, start));
}
