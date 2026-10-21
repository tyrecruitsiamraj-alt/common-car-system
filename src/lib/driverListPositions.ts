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

/**
 * ตำแหน่งคนขับที่ผูกกับผู้บริหาร/บุคคลใดบุคคลหนึ่งโดยเฉพาะ ("ขับนาย") — แยกจากกองกลางด้านบน
 * ใช้เฉพาะในหน้ารายชื่อ Drivers (`/fleet/drivers`) สำหรับแท็บ "ขับนาย"
 * ไม่กระทบปฏิทิน Monitor/BOOKABLE_DRIVER_POSITIONS ซึ่งยังอิง DRIVER_LIST_POSITIONS/Common+Support เดิม
 */
export const PERSONAL_DRIVER_POSITIONS = ['Position Driver', 'Driver Co', 'JP Co'] as const;

export const PERSONAL_DRIVER_POSITIONS_PARAM = PERSONAL_DRIVER_POSITIONS.join(',');

export function isPersonalDriverPosition(position: string | null | undefined): boolean {
  if (!position) return false;
  return (PERSONAL_DRIVER_POSITIONS as readonly string[]).includes(position);
}

/**
 * ตำแหน่งเดี่ยวสำหรับแยกแท็บ "Common" / "เปลี่ยนตัว" ในหน้า Drivers (`/fleet/drivers`)
 * เดิมสองตำแหน่งนี้ถูกจัดกลุ่มรวมกันเป็นแท็บเดียว ("กองกลาง") — ตอนนี้แยกเป็นคนละแท็บ
 * ไม่กระทบ DRIVER_LIST_POSITIONS ด้านบนซึ่งยังใช้ที่ปฏิทิน Monitor/BOOKABLE_DRIVER_POSITIONS เหมือนเดิม
 */
export const COMMON_DRIVER_POSITION = 'Common Driver';
export const TEMP_DRIVER_POSITION = 'Temp Driver';

export function isCommonDriverPosition(position: string | null | undefined): boolean {
  return position === COMMON_DRIVER_POSITION;
}

export function isTempDriverPosition(position: string | null | undefined): boolean {
  return position === TEMP_DRIVER_POSITION;
}

/** รวมทุกตำแหน่งคนขับที่จัดการในหน้า Drivers (กองกลาง + ขับนาย) — ใช้สำหรับแท็บ "พ้นสภาพ" ที่ตัดข้ามตำแหน่ง */
export const DRIVER_DIRECTORY_POSITIONS = [...DRIVER_LIST_POSITIONS, ...PERSONAL_DRIVER_POSITIONS] as const;

export const DRIVER_DIRECTORY_POSITIONS_PARAM = DRIVER_DIRECTORY_POSITIONS.join(',');

export function isDriverDirectoryPosition(position: string | null | undefined): boolean {
  if (!position) return false;
  return (DRIVER_DIRECTORY_POSITIONS as readonly string[]).includes(position);
}
