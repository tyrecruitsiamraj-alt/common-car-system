import { describe, expect, it, vi } from 'vitest';
import { exportComplaintDashboardExcel } from './complaintDashboardExcelExport';
import type { ComplaintYearStats } from './complaintDashboardStats';
import type { Complaint } from '@/types';

const downloadExcelFileMock = vi.fn();
vi.mock('@/lib/exportExcel', () => ({
  downloadExcelFile: (...args: unknown[]) => downloadExcelFileMock(...args),
}));

function makeCase(overrides: Partial<Complaint> = {}): Complaint {
  return {
    id: Math.random().toString(36).slice(2),
    complaint_date: '2026-01-15',
    driver_name: 'สมชาย ใจดี',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

const stats: ComplaintYearStats = {
  total: 3,
  distinctDrivers: 3,
  avgPerMonth: 0.25,
  avgPerDriver: 1,
  repeatComplaints: { count: 0, total: 3, percent: 0, distinctDrivers: 0 },
  latestMonth: { label: 'ม.ค.', count: 3, trendPercent: null },
  severePenalty: { count: 0, total: 3, percent: 0 },
  inactiveEmployees: { count: 0, total: 3, percent: 0 },
  ytdMonthsWithData: 1,
  ytdAvgPerMonth: 3,
  movingAverage3Month: 3,
  peakMonth: { label: 'ม.ค.', count: 3, percentOfYear: 100 },
  repeatCaseType: { count: 0, total: 0, percent: 0 },
  statusNormal: true,
  category: { label: 'Regulation - กฎระเบียบ', count: 2, percent: 66.7 },
  complaintType: null,
  rootCause: null,
  correctiveAction: null,
};

describe('exportComplaintDashboardExcel', () => {
  it('builds a summary sheet plus one sheet per category', () => {
    downloadExcelFileMock.mockClear();
    const cases = [
      makeCase({ category: 'Regulation - กฎระเบียบ' }),
      makeCase({ category: 'Traffic Law - ผิดกฎจราจร' }),
      makeCase({ category: '' }),
    ];

    exportComplaintDashboardExcel(cases, stats, 2026, null, null, [], [], []);

    expect(downloadExcelFileMock).toHaveBeenCalledTimes(1);
    const [filename, sheets] = downloadExcelFileMock.mock.calls[0] as [string, { sheetName: string; rows: unknown[] }[]];

    expect(filename).toContain('complaint-dashboard-2026');

    const sheetNames = sheets.map((s) => s.sheetName);
    expect(sheetNames).toEqual([
      'สรุปตัวชี้วัด',
      'แนวโน้มรายเดือน',
      'หมวดหมู่ (ภาพรวม)',
      'ประเภทร้องเรียน (ภาพรวม)',
      'Regulation - กฎระเบียบ',
      'Traffic Law - ผิดกฎจราจร',
      'ไม่ระบุหมวดหมู่',
    ]);

    const summarySheet = sheets.find((s) => s.sheetName === 'สรุปตัวชี้วัด');
    expect(summarySheet?.rows).toHaveLength(17);

    const regulationSheet = sheets.find((s) => s.sheetName === 'Regulation - กฎระเบียบ');
    expect(regulationSheet?.rows).toHaveLength(1);
  });

  it('falls back to "all" in the filename when no year is selected', () => {
    downloadExcelFileMock.mockClear();
    exportComplaintDashboardExcel([], stats, null, null, null, [], [], []);
    const [filename] = downloadExcelFileMock.mock.calls[0] as [string];
    expect(filename).toContain('complaint-dashboard-all');
  });
});
