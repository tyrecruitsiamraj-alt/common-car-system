import { roundDateToMinuteStep } from './bookingMinuteStep.js';

type BookingSchedule = {
  employee_id: string;
  vehicle_id: string;
  starts_at: string | Date;
  ends_at: string | Date;
  completed_at?: string | Date | null;
};

/** effective_end = completed_at ?? ends_at */
export function bookingEffectiveEndFromSchedule(
  endsAt: string | Date,
  completedAt?: string | Date | null,
): Date {
  if (completedAt != null && completedAt !== '') {
    return roundDateToMinuteStep(new Date(completedAt));
  }
  return roundDateToMinuteStep(new Date(endsAt));
}

/** เช็คทับซ้อนเฉพาะเมื่อขยายช่วงหรือเปลี่ยนรถ/คนขับ — ไม่เช็คเมื่อบันทึกข้อมูลอย่างเดียวหรือย่อช่วง */
export function needsBookingOverlapCheck(
  cur: BookingSchedule,
  patch: Record<string, unknown>,
  employeeId: string,
  vehicleId: string,
  starts: Date,
  ends: Date,
  completedAt?: Date | null,
): boolean {
  const curStarts = roundDateToMinuteStep(new Date(cur.starts_at));
  const curEffectiveEnd = bookingEffectiveEndFromSchedule(cur.ends_at, cur.completed_at);
  const roundedStarts = roundDateToMinuteStep(starts);
  const newEffectiveEnd = bookingEffectiveEndFromSchedule(ends, completedAt);

  const vehicleChanged = patch.vehicle_id !== undefined && vehicleId !== cur.vehicle_id;
  const employeeChanged = patch.employee_id !== undefined && employeeId !== cur.employee_id;
  const startsEarlier = roundedStarts.getTime() < curStarts.getTime();
  const effectiveEndLater = newEffectiveEnd.getTime() > curEffectiveEnd.getTime();

  return vehicleChanged || employeeChanged || startsEarlier || effectiveEndLater;
}
