import { describe, expect, it } from 'vitest';
import { computeComplaintYearStats, listComplaintYears } from '@/lib/complaintDashboardStats';
import type { Complaint } from '@/types';

function makeComplaint(partial: Partial<Complaint>): Complaint {
  return {
    id: partial.id ?? 'c1',
    complaint_date: partial.complaint_date ?? '2026-01-10',
    driver_name: partial.driver_name ?? 'ทดสอบ',
    created_at: '2026-01-10T00:00:00.000Z',
    updated_at: '2026-01-10T00:00:00.000Z',
    ...partial,
  };
}

describe('listComplaintYears', () => {
  it('returns distinct years, most recent first', () => {
    const cases = [
      makeComplaint({ complaint_date: '2025-03-01' }),
      makeComplaint({ complaint_date: '2026-01-01' }),
      makeComplaint({ complaint_date: '2025-11-01' }),
    ];
    expect(listComplaintYears(cases)).toEqual([2026, 2025]);
  });
});

describe('computeComplaintYearStats', () => {
  it('computes totals, distinct drivers, and averages', () => {
    const cases = [
      makeComplaint({ driver_name: 'A', complaint_date: '2026-01-05' }),
      makeComplaint({ driver_name: 'A', complaint_date: '2026-01-15' }),
      makeComplaint({ driver_name: 'B', complaint_date: '2026-02-01' }),
    ];
    const stats = computeComplaintYearStats(cases);
    expect(stats.total).toBe(3);
    expect(stats.distinctDrivers).toBe(2);
    expect(stats.avgPerMonth).toBe(0.3); // 3/12 rounded to 1 decimal
    expect(stats.avgPerDriver).toBe(1.5);
  });

  it('counts repeat complaints (occurrence_count >= 2) and their distinct drivers', () => {
    const cases = [
      makeComplaint({ driver_name: 'A', occurrence_count: 'ครั้งที่ 1' }),
      makeComplaint({ driver_name: 'A', occurrence_count: 'ครั้งที่ 2' }),
      makeComplaint({ driver_name: 'B', occurrence_count: 'ครั้งที่ 3' }),
      makeComplaint({ driver_name: 'C', occurrence_count: undefined }),
    ];
    const stats = computeComplaintYearStats(cases);
    expect(stats.repeatComplaints).toEqual({ count: 2, total: 4, percent: 50, distinctDrivers: 2 });
  });

  it('flags severe penalty via penalty text or พ้นสภาพ status', () => {
    const cases = [
      makeComplaint({ penalty: 'พักงาน' }),
      makeComplaint({ penalty: 'เตือนด้วยวาจา', employee_status: 'พ้นสภาพ' }),
      makeComplaint({ penalty: 'หนังสือเตือน', employee_status: 'ทำงานอยู่' }),
    ];
    const stats = computeComplaintYearStats(cases);
    expect(stats.severePenalty).toEqual({ count: 2, total: 3, percent: 66.7 });
  });

  it('flags inactive employees (ลาออก/พ้นสภาพ)', () => {
    const cases = [
      makeComplaint({ employee_status: 'ลาออก' }),
      makeComplaint({ employee_status: 'พ้นสภาพ' }),
      makeComplaint({ employee_status: 'ทำงานอยู่' }),
    ];
    const stats = computeComplaintYearStats(cases);
    expect(stats.inactiveEmployees).toEqual({ count: 2, total: 3, percent: 66.7 });
  });

  it('computes latest month count, trend vs previous month, moving average, and peak month', () => {
    const cases = [
      ...Array.from({ length: 6 }, () => makeComplaint({ complaint_date: '2026-06-10' })),
      ...Array.from({ length: 4 }, () => makeComplaint({ complaint_date: '2026-07-10' })),
      ...Array.from({ length: 3 }, () => makeComplaint({ complaint_date: '2026-08-10' })),
    ];
    const stats = computeComplaintYearStats(cases);
    expect(stats.latestMonth).toEqual({ label: 'ส.ค.', count: 3, trendPercent: -25 });
    expect(stats.movingAverage3Month).toBe(4.3);
    expect(stats.peakMonth).toEqual({ label: 'มิ.ย.', count: 6, percentOfYear: 46.2 });
  });

  it('marks status abnormal when the latest month spikes well above the 3-month average', () => {
    const cases = [
      makeComplaint({ complaint_date: '2026-06-10' }),
      makeComplaint({ complaint_date: '2026-07-10' }),
      ...Array.from({ length: 10 }, () => makeComplaint({ complaint_date: '2026-08-10' })),
    ];
    const stats = computeComplaintYearStats(cases);
    expect(stats.statusNormal).toBe(false);
  });

  it('computes repeat case_type ("เหตุเดิม") as a percent of cases that have case_type set', () => {
    const cases = [
      makeComplaint({ case_type: 'เหตุเดิม' }),
      makeComplaint({ case_type: 'เหตุการณ์ใหม่' }),
      makeComplaint({ case_type: 'เหตุการณ์ใหม่' }),
      makeComplaint({ case_type: undefined }),
    ];
    const stats = computeComplaintYearStats(cases);
    expect(stats.repeatCaseType).toEqual({ count: 1, total: 3, percent: 33.3 });
  });

  it('picks the most common category/complaint_type/root_cause/corrective_action', () => {
    const cases = [
      makeComplaint({ category: 'A', complaint_type: 'X', root_cause: 'R1', corrective_action: 'C1' }),
      makeComplaint({ category: 'A', complaint_type: 'Y', root_cause: 'R1', corrective_action: 'C2' }),
      makeComplaint({ category: 'B', complaint_type: 'X', root_cause: 'R2', corrective_action: 'C2' }),
    ];
    const stats = computeComplaintYearStats(cases);
    expect(stats.category).toEqual({ label: 'A', count: 2, percent: 67 });
    expect(stats.rootCause).toEqual({ label: 'R1', count: 2, percent: 67 });
  });
});
