/** ต้องตรงกับฝั่ง frontend (src/lib/workHoursConfig.ts) */
export const ACCESS_WORK_HOURS_CAPABILITY = 'access_work_hours';

export type WorkHoursPeriod = 'day' | 'week' | 'month' | 'year';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** ช่วงวันที่ (รวมปลายทาง) ของ period ที่ครอบคลุม anchor date */
export function periodBounds(period: WorkHoursPeriod, anchor: Date): { from: string; to: string } {
  const d = new Date(anchor);
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

  const windowStart = new Date(startsAt);
  windowStart.setHours(8, 0, 0, 0);
  const windowEnd = new Date(startsAt);
  windowEnd.setHours(17, 0, 0, 0);

  const overlapStart = Math.max(startsAt.getTime(), windowStart.getTime());
  const overlapEnd = Math.min(completedAt.getTime(), windowEnd.getTime());
  const normalMs = Math.max(0, overlapEnd - overlapStart);
  const normalHours = normalMs / 3_600_000;
  const otHours = Math.max(0, totalHours - normalHours);

  return { totalHours, normalHours, otHours };
}

export function dateToYmd(d: Date): string {
  return ymd(d);
}

/** ชั่วโมงทำงานเฉลี่ยต่อวันที่มีงานจริง ใช้เทียบกับเกณฑ์ชั่วโมงทำงานเต็มเวลา (ชม./วัน) */
export function avgHoursPerDay(totalHours: number, daysWorked: number): number {
  return daysWorked > 0 ? totalHours / daysWorked : 0;
}

export type MonthBucket = { key: string; year: number; month: number; from: string; to: string };

/** ไล่ N เดือนย้อนหลังจาก anchor (รวมเดือนของ anchor) เรียงจากเก่าไปใหม่ — key เป็น YYYY-MM */
export function lastMonthBuckets(count: number, anchor: Date): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const { from, to } = periodBounds('month', d);
    buckets.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, year: d.getFullYear(), month: d.getMonth(), from, to });
  }
  return buckets;
}
