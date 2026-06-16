import { roundDateToMinuteStep } from './bookingMinuteStep.js';

type BookingSchedule = {
  employee_id: string;
  vehicle_id: string;
  starts_at: string | Date;
  ends_at: string | Date;
};

/** เช็คทับซ้อนเฉพาะเมื่อขยายช่วงหรือเปลี่ยนรถ/คนขับ — ไม่เช็คเมื่อบันทึกข้อมูลอย่างเดียวหรือปิดใบ */
export function needsBookingOverlapCheck(
  cur: BookingSchedule,
  patch: Record<string, unknown>,
  employeeId: string,
  vehicleId: string,
  starts: Date,
  ends: Date,
): boolean {
  const curStarts = roundDateToMinuteStep(new Date(cur.starts_at));
  const curEnds = roundDateToMinuteStep(new Date(cur.ends_at));
  const roundedStarts = roundDateToMinuteStep(starts);
  const roundedEnds = roundDateToMinuteStep(ends);

  const vehicleChanged = patch.vehicle_id !== undefined && vehicleId !== cur.vehicle_id;
  const employeeChanged = patch.employee_id !== undefined && employeeId !== cur.employee_id;
  const startsEarlier = roundedStarts.getTime() < curStarts.getTime();
  const endsLater = roundedEnds.getTime() > curEnds.getTime();

  return vehicleChanged || employeeChanged || startsEarlier || endsLater;
}
