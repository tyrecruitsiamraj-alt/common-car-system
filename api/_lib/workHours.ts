/** ต้องตรงกับฝั่ง frontend (src/lib/workHoursConfig.ts) */
export const ACCESS_WORK_HOURS_CAPABILITY = 'access_work_hours';

export type WorkHoursPeriod = 'day' | 'week' | 'month' | 'year';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * วันที่ (YYYY-MM-DD) จากคอลัมน์ postgres `date` — node-postgres parse เป็น Date ด้วย
 * เขตเวลาท้องถิ่นของเครื่องที่รัน (new Date(year, month, day)) จึงต้องอ่านกลับด้วย
 * getFullYear/getMonth/getDate เท่านั้น ห้ามผ่าน toISOString() ซึ่งแปลงเป็น UTC ก่อน
 * (ถ้าเครื่องตั้งเขตเวลาเร็วกว่า UTC จะได้วันที่ย้อนไป 1 วัน)
 */
export function pgDateToYmd(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return ymd(value);
}

/**
 * แกะวัน/เวลาแบบ wall-clock ของเขตเวลาไทย (Asia/Bangkok) จาก instant ใดๆ
 * ไม่พึ่งเขตเวลาของเครื่อง/เซิร์ฟเวอร์ที่รันโค้ด (Vercel/Node มักรันเป็น UTC)
 */
function bangkokParts(d: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
}

/** วันที่ตามปฏิทินไทย (YYYY-MM-DD) ของ instant ใดๆ — ใช้แทน toISOString().slice(0,10) ที่อิงเขตเวลา UTC */
export function bangkokYmd(d: Date): string {
  const { year, month, day } = bangkokParts(d);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** เดือนตามปฏิทินไทย (YYYY-MM) ของ instant ใดๆ */
export function bangkokYearMonth(d: Date): string {
  const { year, month } = bangkokParts(d);
  return `${year}-${pad(month)}`;
}

/**
 * Date ที่เมื่ออ่านด้วย getFullYear/getMonth/getDate/getDay ของเครื่องที่รัน จะได้ค่า wall-clock
 * ตามเขตเวลาไทยเสมอ (เทคนิคเดียวกับ nowInBangkok ฝั่ง frontend) — ใช้ต่อกับเลขคณิตวัน/สัปดาห์/เดือนเดิมได้ตรงๆ
 */
function toBangkokWallClock(d: Date): Date {
  const { year, month, day, hour, minute } = bangkokParts(d);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/** instant จริงของเวลา hour:00 ตามเขตเวลาไทย ของ "วันที่ปฏิทินไทย" ที่ d ตกอยู่ — ไทยไม่มี DST จึงเป็น UTC+7 คงที่ */
function bangkokWallClockInstant(d: Date, hour: number): Date {
  const { year, month, day } = bangkokParts(d);
  return new Date(Date.UTC(year, month - 1, day, hour - 7, 0, 0, 0));
}

/** ช่วงวันที่ (รวมปลายทาง) ของ period ที่ครอบคลุม anchor date — คำนวณตามปฏิทินไทยเสมอ */
export function periodBounds(period: WorkHoursPeriod, anchor: Date): { from: string; to: string } {
  const d = toBangkokWallClock(anchor);
  if (period === 'day') {
    return { from: ymd(d), to: ymd(d) };
  }
  if (period === 'week') {
    const day = d.getDay(); // 0=Sun..6=Sat → ให้สัปดาห์เริ่มจันทร์
    const diffToMonday = (day + 6) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: ymd(start), to: ymd(end) };
  }
  if (period === 'year') {
    return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` };
  }
  // month
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: ymd(start), to: ymd(end) };
}

/**
 * แบ่งชั่วโมงของงาน (starts_at → completed_at) เป็นชั่วโมงปกติ (ในกรอบ 08:00–17:00 ของวันที่เริ่มงาน)
 * กับชั่วโมง OT (ก่อน 08:00 หรือหลัง 17:00) — ตามกติกาที่ตกลงกันไว้
 */
export function splitWorkHours(startsAt: Date, completedAt: Date): { totalHours: number; normalHours: number; otHours: number } {
  const totalMs = Math.max(0, completedAt.getTime() - startsAt.getTime());
  const totalHours = totalMs / 3_600_000;

  const windowStart = bangkokWallClockInstant(startsAt, 8);
  const windowEnd = bangkokWallClockInstant(startsAt, 17);

  const overlapStart = Math.max(startsAt.getTime(), windowStart.getTime());
  const overlapEnd = Math.min(completedAt.getTime(), windowEnd.getTime());
  const normalMs = Math.max(0, overlapEnd - overlapStart);
  const normalHours = normalMs / 3_600_000;
  const otHours = Math.max(0, totalHours - normalHours);

  return { totalHours, normalHours, otHours };
}

/** ชั่วโมงทำงานเฉลี่ยต่อวันที่มีงานจริง ใช้เทียบกับเกณฑ์ชั่วโมงทำงานเต็มเวลา (ชม./วัน) */
export function avgHoursPerDay(totalHours: number, daysWorked: number): number {
  return daysWorked > 0 ? totalHours / daysWorked : 0;
}

export type MonthBucket = { key: string; year: number; month: number; from: string; to: string };

/** ไล่ N เดือนย้อนหลังจาก anchor (รวมเดือนของ anchor) เรียงจากเก่าไปใหม่ — key เป็น YYYY-MM */
export function lastMonthBuckets(count: number, anchor: Date): MonthBucket[] {
  const base = toBangkokWallClock(anchor);
  const buckets: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 0);
    buckets.push({
      key: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
      year: start.getFullYear(),
      month: start.getMonth(),
      from: ymd(start),
      to: ymd(end),
    });
  }
  return buckets;
}
