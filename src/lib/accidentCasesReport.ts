import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import type { AccidentCase } from '@/types';

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

export function monthKey(caseDate: string): string {
  return caseDate.slice(0, 7);
}

export function buildMonthlyTrend(cases: AccidentCase[], months = 6): { label: string; count: number }[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const counts = new Map<string, number>();
  for (const c of cases) {
    const key = monthKey(c.case_date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((key) => {
    const [y, m] = key.split('-');
    const label = format(new Date(Number(y), Number(m) - 1, 1), 'MMM yy', { locale: th });
    return { label, count: counts.get(key) ?? 0 };
  });
}

export function isSameMonthAsNow(caseDate: string, now = new Date()): boolean {
  const d = parseISO(caseDate);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
