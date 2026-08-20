import { describe, expect, it } from 'vitest';
import {
  bucketEmployeeAge,
  bucketTopCategories,
  bucketYearsOfService,
  buildMonthlyTrend,
  countDistinctEmployees,
  isSameMonthAsNow,
  mostCommonValue,
} from '@/lib/accidentCasesReport';
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

describe('mostCommonValue', () => {
  it('returns the most frequent value with count and percent of total', () => {
    expect(mostCommonValue(['a', 'a', 'b'])).toEqual({ label: 'a', count: 2, percent: 67 });
  });

  it('ignores blank/undefined entries but still counts them toward total when total is left implicit', () => {
    expect(mostCommonValue(['a', '', undefined, 'a'])).toEqual({ label: 'a', count: 2, percent: 50 });
  });

  it('accepts an explicit total override for the percent denominator', () => {
    expect(mostCommonValue(['a', 'a'], 4)).toEqual({ label: 'a', count: 2, percent: 50 });
  });

  it('returns null when every value is blank', () => {
    expect(mostCommonValue(['', undefined, '  '])).toBeNull();
  });
});

describe('bucketYearsOfService', () => {
  it('buckets free-text tenure strings into the standard bands and picks the most common', () => {
    const values = ['4 ปี', '10 ปี', '2 สัปดาห์', '14 ปี', '9 ปี', '8 ปี', '7 ปี'];
    expect(bucketYearsOfService(values)).toEqual({ label: 'มากกว่า 7 ปี', count: 5, percent: 71 });
  });

  it('treats a value with only months/weeks as under 1 year', () => {
    expect(bucketYearsOfService(['5 เดือน', '2 สัปดาห์'])).toEqual({ label: 'น้อยกว่า 1 ปี', count: 2, percent: 100 });
  });
});

describe('bucketEmployeeAge', () => {
  it('buckets free-text age strings into decade bands and picks the most common', () => {
    const values = ['57 ปี', '39 ปี', '50 ปี', '56 ปี', '58 ปี', '62 ปี'];
    expect(bucketEmployeeAge(values)).toEqual({ label: '50 - 59 ปี', count: 4, percent: 67 });
  });
});

describe('countDistinctEmployees', () => {
  it('counts unique, trimmed employee names', () => {
    const cases = [
      makeCase({ employee_name: 'สมชาย ใจดี' }),
      makeCase({ employee_name: 'สมหญิง รักดี' }),
      makeCase({ employee_name: 'สมชาย ใจดี' }),
    ];
    expect(countDistinctEmployees(cases)).toBe(2);
  });
});
