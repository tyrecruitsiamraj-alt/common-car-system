/** ขั้นนาทีในฟอร์มจอง — ตรงกับ TimeHm24Select */
export const BOOKING_MINUTE_STEP = 10;

/** ปัดเวลาให้ตรงขั้นนาที (ไม่ให้มีเศษวินาที/นาทีตอนบันทึก) */
export function roundDateToMinuteStep(date: Date, step = BOOKING_MINUTE_STEP): Date {
  const d = new Date(date.getTime());
  d.setSeconds(0, 0);
  const total = d.getHours() * 60 + d.getMinutes();
  let rounded = Math.round(total / step) * step;
  if (rounded >= 24 * 60) {
    d.setDate(d.getDate() + 1);
    rounded = 0;
  }
  d.setHours(Math.floor(rounded / 60), rounded % 60, 0, 0);
  return d;
}
