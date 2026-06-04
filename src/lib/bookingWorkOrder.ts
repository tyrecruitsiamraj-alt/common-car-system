import type { VehicleBooking } from '@/types';

/** เลขใบงาน — ถ้ายังไม่มีในฐานข้อมูลใช้รหัสย่อจาก id */
export function formatBookingWorkOrderNo(
  b: Pick<VehicleBooking, 'work_order_no' | 'id'>,
): string {
  const no = (b.work_order_no ?? '').trim();
  if (no) return no;
  return `BK-${b.id.slice(0, 8).toUpperCase()}`;
}
