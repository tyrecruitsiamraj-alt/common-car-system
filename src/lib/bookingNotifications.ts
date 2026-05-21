import { addDays, parseISO, startOfDay } from 'date-fns';
import { isBookingOverdueNotCompleted } from '@/lib/fleetBookingsDashboard';
import { formatThaiTimeRange } from '@/lib/thaiDateTimeFormat';
import type { Notification, NotificationType } from '@/types/notification';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

const READ_STORAGE_KEY = 'fleet_booking_notification_read_v1';

export function loadReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function notificationIdForBooking(bookingId: string): string {
  return `booking-${bookingId}`;
}

function pickNotificationType(b: VehicleBooking): NotificationType {
  const note = (b.notes || '').trim();
  if (/อุบัติ|accident/i.test(note)) return 'urgent_job';
  if (/vip/i.test(note)) return 'assignment';
  return 'alert';
}

/** แจ้งเตือนเฉพาะจองที่เลยเวลาสิ้นสุดแล้วแต่ยังไม่กดเสร็จสิ้น */
export function buildInProgressBookingNotifications(
  bookings: VehicleBooking[],
  employees: Employee[],
  vehicles: Vehicle[],
  readIds: Set<string>,
  now = new Date(),
): Notification[] {
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const vehMap = new Map(vehicles.map((v) => [v.id, v]));

  return bookings
    .filter((b) => isBookingOverdueNotCompleted(b, now))
    .sort((a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime())
    .map((b) => {
      const emp = empMap.get(b.employee_id);
      const veh = vehMap.get(b.vehicle_id);
      const driver =
        emp ? `${emp.first_name} ${emp.last_name}`.trim() : 'ผู้ขับ';
      const plate = veh?.plate_no ?? '—';
      const dest = (b.destination || b.notes || '').trim() || 'ไม่ระบุสถานที่';
      const time = formatThaiTimeRange(b.starts_at, b.ends_at);
      const id = notificationIdForBooking(b.id);

      return {
        id,
        type: pickNotificationType(b),
        title: `เลยเวลาแล้วยังไม่เสร็จ: ${dest.length > 36 ? `${dest.slice(0, 36)}…` : dest}`,
        message: `${driver} · ${plate} · ${time} — กรุณากดเสร็จสิ้น`,
        timestamp: b.updated_at || b.starts_at,
        read: readIds.has(id),
        link: '/fleet/bookings',
      };
    });
}

/** ช่วงโหลดการจองสำหรับแจ้งเตือน — วันนี้ถึง 14 วันข้างหน้า */
export function notificationBookingRange(): { from: Date; to: Date } {
  const from = startOfDay(new Date());
  const to = addDays(from, 14);
  return { from, to };
}

export function notifyFleetBookingsChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fleet-bookings-changed'));
  }
}
