import { describe, expect, it } from 'vitest';
import { filterByPeriod, periodBounds, type IssueReportRow } from '@/lib/issueReportStats';

function row(id: string, report_date?: string): IssueReportRow {
  return { id, category: 'leave', report_date, data: {}, created_at: '2026-01-01T00:00:00.000Z' };
}

describe('ช่วงเวลา "ทุกวันที่"', () => {
  const now = new Date('2026-11-06T12:00:00');

  it('ไม่มีขอบเขตวันที่', () => {
    expect(periodBounds('all', now)).toEqual({});
  });

  it('คืนทุกแถว รวมแถวที่ไม่มีวันที่', () => {
    const rows = [row('a', '2024-03-01'), row('b', '2026-11-01'), row('c')];
    expect(filterByPeriod(rows, 'all', now).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('ช่วงอื่นยังกรองตามเดิม', () => {
    const rows = [row('a', '2026-10-31'), row('b', '2026-11-01'), row('c')];
    expect(filterByPeriod(rows, 'month', now).map((r) => r.id)).toEqual(['b']);
  });
});
