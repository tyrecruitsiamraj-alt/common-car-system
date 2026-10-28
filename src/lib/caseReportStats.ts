import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { parseISO } from 'date-fns';

export type CategoryBucket = {
  label: string;
  count: number;
};

/** จัดกลุ่มค่าที่พบบ่อยสุด N อันดับ ที่เหลือรวมเป็น "อื่นๆ" — กันสีหมวดหมู่ล้นเมื่อเป็น free text */
export function bucketTopCategories(
  values: (string | undefined)[],
  topN = 6,
  emptyLabel = 'ไม่ระบุ',
): CategoryBucket[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = (raw ?? '').trim() || emptyLabel;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const restTotal = rest.reduce((sum, [, c]) => sum + c, 0);
  const buckets: CategoryBucket[] = top.map(([label, count]) => ({ label, count }));
  if (restTotal > 0) buckets.push({ label: 'อื่นๆ', count: restTotal });
  return buckets;
}

export function monthKey(dateYmd: string): string {
  return dateYmd.slice(0, 7);
}

/** เคสรายเดือน N เดือนล่าสุด (รวมเดือนปัจจุบัน) จากลิสต์วันที่ (yyyy-MM-dd) */
export function buildMonthlyTrend(dates: string[], months = 6): { label: string; count: number }[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const counts = new Map<string, number>();
  for (const dateYmd of dates) {
    const key = monthKey(dateYmd);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((key) => {
    const [y, m] = key.split('-');
    const label = format(new Date(Number(y), Number(m) - 1, 1), 'MMM yy', { locale: th });
    return { label, count: counts.get(key) ?? 0 };
  });
}

export type MonthlyStatusPoint = { label: string; wrong: number; right: number; excluded: number; total: number };

/** แนวโน้มเคสรายเดือนแยกตามสถานะ (ฝ่ายผิด / ฝ่ายถูก / ฝ่ายผิดไม่นับเคส) พร้อมยอดรวม N เดือนล่าสุด (รวมเดือนปัจจุบัน) */
export function buildMonthlyStatusTrend(
  entries: { date: string; status?: string | null }[],
  months = 6,
): MonthlyStatusPoint[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const counts = new Map<string, { wrong: number; right: number; excluded: number }>();
  for (const { date, status } of entries) {
    const key = monthKey(date);
    const bucket = counts.get(key) ?? { wrong: 0, right: 0, excluded: 0 };
    const s = (status ?? '').trim();
    if (s === 'ฝ่ายผิด') bucket.wrong += 1;
    else if (s === 'ฝ่ายถูก') bucket.right += 1;
    else if (s === 'ฝ่ายผิดไม่นับเคส') bucket.excluded += 1;
    counts.set(key, bucket);
  }
  return keys.map((key) => {
    const [y, m] = key.split('-');
    const label = format(new Date(Number(y), Number(m) - 1, 1), 'MMM yy', { locale: th });
    const bucket = counts.get(key) ?? { wrong: 0, right: 0, excluded: 0 };
    return { label, ...bucket, total: bucket.wrong + bucket.right + bucket.excluded };
  });
}

export function isSameMonthAsNow(dateYmd: string, now = new Date()): boolean {
  const d = parseISO(dateYmd);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export type TopValueSummary = { label: string; count: number; percent: number };

/** ค่าที่พบมากสุดในลิสต์ + จำนวน + % เทียบกับ total (ค่าว่าง/undefined จะไม่ถูกนับเป็นตัวเลือก) */
export function mostCommonValue(
  values: (string | null | undefined)[],
  total = values.length,
): TopValueSummary | null {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const v = (raw ?? '').trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const [label, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return { label, count, percent };
}

/** ดึงจำนวนปีจากข้อความช่วงเวลา เช่น "3 ปี 7 เดือน" -> 3, "5 เดือน" -> 0; คืน null ถ้าอ่านไม่ได้ */
function parseWholeYears(raw?: string | null): number | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const yearMatch = /(\d+)\s*ปี/.exec(s);
  if (yearMatch) return parseInt(yearMatch[1], 10);
  if (/เดือน|สัปดาห์|วัน/.test(s)) return 0;
  return null;
}

const YEARS_OF_SERVICE_BANDS: { max: number; label: string }[] = [
  { max: 0, label: 'น้อยกว่า 1 ปี' },
  { max: 3, label: '1 - 3 ปี' },
  { max: 6, label: '4 - 6 ปี' },
  { max: Infinity, label: 'มากกว่า 7 ปี' },
];

/** ช่วงอายุงานจากฟิลด์อายุงานแบบข้อความอิสระ เช่น "4 ปี" -> "1 - 3 ปี"; คืน null ถ้าอ่านไม่ได้ */
export function getYearsOfServiceLabel(raw?: string | null): string | null {
  const years = parseWholeYears(raw);
  if (years == null) return null;
  return YEARS_OF_SERVICE_BANDS.find((b) => years <= b.max)?.label ?? null;
}

/** ช่วงอายุงานที่พบมากสุด (เช่น "มากกว่า 7 ปี") จากฟิลด์อายุงานแบบข้อความอิสระ */
export function bucketYearsOfService(values: (string | null | undefined)[]): TopValueSummary | null {
  return mostCommonValue(values.map(getYearsOfServiceLabel), values.length);
}

const EMPLOYEE_AGE_BANDS: { max: number; label: string }[] = [
  { max: 29, label: 'น้อยกว่า 30 ปี' },
  { max: 39, label: '30 - 39 ปี' },
  { max: 49, label: '40 - 49 ปี' },
  { max: 59, label: '50 - 59 ปี' },
  { max: Infinity, label: '60 ปีขึ้นไป' },
];

/** ช่วงอายุพนักงานจากฟิลด์อายุพนักงานแบบข้อความอิสระ เช่น "57 ปี" -> "50 - 59 ปี"; คืน null ถ้าอ่านไม่ได้ */
export function getEmployeeAgeLabel(raw?: string | null): string | null {
  const age = parseWholeYears(raw);
  if (age == null) return null;
  return EMPLOYEE_AGE_BANDS.find((b) => age <= b.max)?.label ?? null;
}

/** ช่วงอายุพนักงานที่พบมากสุด (เช่น "50 - 59 ปี") จากฟิลด์อายุพนักงานแบบข้อความอิสระ */
export function bucketEmployeeAge(values: (string | null | undefined)[]): TopValueSummary | null {
  return mostCommonValue(values.map(getEmployeeAgeLabel), values.length);
}

/** จำนวนค่าที่ไม่ซ้ำกันในลิสต์ (เช่น จำนวนพนักงานไม่ซ้ำที่เกิดเคส) */
export function countDistinctValues(values: (string | null | undefined)[]): number {
  return new Set(values.map((v) => (v ?? '').trim()).filter(Boolean)).size;
}

export type BreakdownRow = { label: string; count: number; percent: number };

/** แจกแจงทุกค่าที่พบ (ไม่ใช่แค่ค่าที่มากสุด) เรียงจากมากไปน้อย — ใช้เปิดดูรายละเอียดของแต่ละกล่องสถิติ */
export function breakdownValues(
  values: (string | null | undefined)[],
  total = values.length,
): BreakdownRow[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const v = (raw ?? '').trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 }));
}
