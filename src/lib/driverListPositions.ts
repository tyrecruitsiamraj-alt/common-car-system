/**
 * ตำแหน่งคนขับที่ใช้แสดงในหน้ารายชื่อ/ปฏิทินคนขับ — Common Driver กับ Temp Driver เท่านั้น
 * (ไม่รวม Position Driver ที่เป็นคนขับผู้บริหาร, Driver Co, Support Driver, JP Co — บริหารจัดการแยกที่อื่น)
 * ใช้ร่วมกันที่ src/pages/wl/WLEmployees.tsx (`/fleet/drivers`) และ
 * src/pages/fleet/FleetBookingsPage.tsx โหมด monitor (`/fleet/monitor`)
 *
 * หมายเหตุ: คนละชุดกับ BOOKABLE_DRIVER_POSITIONS ใน `bookingAvailability.ts`
 * ซึ่งเป็นกฎ "ใครจองได้" ของหน้าจองรถ ไม่ใช่กฎการแสดงผลรายชื่อ/ปฏิทินนี้
 */
export const DRIVER_LIST_POSITIONS = ['Common Driver', 'Temp Driver'] as const;

export const DRIVER_LIST_POSITIONS_PARAM = DRIVER_LIST_POSITIONS.join(',');

export function isDriverListPosition(position: string | null | undefined): boolean {
  if (!position) return false;
  return (DRIVER_LIST_POSITIONS as readonly string[]).includes(position);
}
