import { describe, expect, it } from 'vitest';
import { bucketTopCategories, buildMonthlyTrend, isSameMonthAsNow } from '@/lib/accidentCasesReport';
import type { AccidentCase } from '@/types';

function makeCase(partial: Partial<AccidentCase>): AccidentCase {
  return {
    id: partial.id ?? 'c1',
    case_date: partial.case_date ?? '2026-01-10',
    employee_name: partial.employee_name ?? 'ทดสอบ',
    created_at: '2026-01-10T00:00:00.000Z',
    updated_at: '2026-01-10T00:00:00.000Z',
    ...partial,
  };
}

describe('bucketTopCategories', () => {
  it('groups by value and sorts descending by count', () => {
    const buckets = bucketTopCategories(['a', 'a', 'b', 'a', 'b', 'c']);
    expect(buckets).toEqual([
      { label: 'a', count: 3 },
      { label: 'b', count: 2 },
      { label: 'c', count: 1 },
    ]);
  });

  it('folds values beyond topN into "อื่นๆ"', () => {
    const values = ['a', 'a', 'a', 'b', 'b', 'c', 'd', 'e', 'f', 'g'];
    const buckets = bucketTopCategories(values, 3);
    expect(buckets).toEqual([
      { label: 'a', count: 3 },
      { label: 'b', count: 2 },
      { label: 'c', count: 1 },
      { label: 'อื่นๆ', count: 4 },
    ]);
  });

  it('treats blank/undefined values as "ไม่ระบุ"', () => {
    const buckets = bucketTopCategories(['x', undefined, '', '  ']);
    expect(buckets).toEqual([
      { label: 'ไม่ระบุ', count: 3 },
      { label: 'x', count: 1 },
    ]);
  });
});

describe('buildMonthlyTrend', () => {
  it('returns one bucket per month in range, counting matching cases', () => {
    const now = new Date();
    const thisMonthYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`;
    const cases = [makeCase({ case_date: thisMonthYmd }), makeCase({ case_date: thisMonthYmd })];
    const trend = buildMonthlyTrend(cases, 3);
    expect(trend).toHaveLength(3);
    expect(trend[trend.length - 1].count).toBe(2);
    expect(trend[0].count).toBe(0);
  });
});

describe('isSameMonthAsNow', () => {
  it('matches same year+month, ignores day', () => {
    const now = new Date(2026, 4, 15);
    expect(isSameMonthAsNow('2026-05-01', now)).toBe(true);
    expect(isSameMonthAsNow('2026-05-31', now)).toBe(true);
    expect(isSameMonthAsNow('2026-04-30', now)).toBe(false);
    expect(isSameMonthAsNow('2025-05-15', now)).toBe(false);
  });
});
