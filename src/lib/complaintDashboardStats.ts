import type { Complaint } from '@/types';
import { countDistinctValues, mostCommonValue, monthKey, type TopValueSummary } from '@/lib/caseReportStats';

const SEVERE_PENALTIES = new Set(['พักงาน', 'หนังสือเตือน/พักงาน', 'เปลี่ยนตัว', 'เปลี่ยนตำแหน่งเป็น Common']);
const INACTIVE_STATUSES = new Set(['ลาออก', 'พ้นสภาพ']);

/** ปีทั้งหมดที่มีข้อมูล (พ.ศ. แบบ ค.ศ.) เรียงล่าสุดก่อน — ใช้เติม dropdown ปีที่วิเคราะห์ */
export function listComplaintYears(cases: Complaint[]): number[] {
  const years = new Set(cases.map((c) => Number(c.complaint_date.slice(0, 4))).filter((y) => Number.isFinite(y)));
  return [...years].sort((a, b) => b - a);
}

/** "ครั้งที่ 3" -> 3; ค่าว่าง/อ่านไม่ได้ -> 1 (ถือว่าเป็นครั้งแรก) */
function parseOccurrenceNumber(raw?: string | null): number {
  const m = /(\d+)/.exec((raw ?? '').trim());
  return m ? parseInt(m[1], 10) : 1;
}

export type PercentSummary = { count: number; total: number; percent: number };

function percentOf(count: number, total: number): PercentSummary {
  return { count, total, percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0 };
}

/** จำนวนเคสต่อเดือน (yyyy-MM -> count) จากเคสที่ให้มา */
function monthlyCounts(cases: Complaint[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of cases) {
    const key = monthKey(c.complaint_date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export type MonthTrendPoint = { key: string; label: string; count: number };

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const idx = Number(m) - 1;
  const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  return THAI_MONTHS_SHORT[idx] ?? key;
}

/** ไล่ N เดือนก่อนหน้า (รวมเดือนสิ้นสุด) เป็น key เรียงจากเก่าไปใหม่ */
function precedingMonthKeys(endKey: string, count: number): string[] {
  const [y, m] = endKey.split('-').map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export type ComplaintYearStats = {
  total: number;
  distinctDrivers: number;
  avgPerMonth: number;
  avgPerDriver: number;
  repeatComplaints: PercentSummary & { distinctDrivers: number };
  latestMonth: { label: string; count: number; trendPercent: number | null };
  severePenalty: PercentSummary;
  inactiveEmployees: PercentSummary;
  ytdMonthsWithData: number;
  ytdAvgPerMonth: number;
  movingAverage3Month: number;
  peakMonth: { label: string; count: number; percentOfYear: number };
  repeatCaseType: PercentSummary;
  statusNormal: boolean;
  category: TopValueSummary | null;
  complaintType: TopValueSummary | null;
  rootCause: TopValueSummary | null;
  correctiveAction: TopValueSummary | null;
};

/** คำนวณตัวชี้วัดทั้งหมดของแดชบอร์ดเรื่องร้องเรียนสำหรับปีที่เลือก */
export function computeComplaintYearStats(cases: Complaint[]): ComplaintYearStats {
  const total = cases.length;
  const distinctDrivers = countDistinctValues(cases.map((c) => c.driver_name));

  const repeatCases = cases.filter((c) => parseOccurrenceNumber(c.occurrence_count) >= 2);
  const repeatComplaints = {
    ...percentOf(repeatCases.length, total),
    distinctDrivers: countDistinctValues(repeatCases.map((c) => c.driver_name)),
  };

  const counts = monthlyCounts(cases);
  const monthKeys = [...counts.keys()].sort();
  const latestKey = monthKeys[monthKeys.length - 1];
  const latestCount = latestKey ? counts.get(latestKey) ?? 0 : 0;
  const prevKey = latestKey ? precedingMonthKeys(latestKey, 2)[0] : undefined;
  const prevCount = prevKey ? counts.get(prevKey) ?? 0 : 0;
  const trendPercent = prevCount > 0 ? Math.round(((latestCount - prevCount) / prevCount) * 1000) / 10 : null;

  const severePenalty = percentOf(
    cases.filter((c) => SEVERE_PENALTIES.has((c.penalty ?? '').trim()) || c.employee_status === 'พ้นสภาพ').length,
    total,
  );
  const inactiveEmployees = percentOf(
    cases.filter((c) => INACTIVE_STATUSES.has((c.employee_status ?? '').trim())).length,
    total,
  );

  const ytdMonthsWithData = monthKeys.length;
  const ytdAvgPerMonth = ytdMonthsWithData > 0 ? Math.round((total / ytdMonthsWithData) * 10) / 10 : 0;

  const last3Keys = latestKey ? precedingMonthKeys(latestKey, 3) : [];
  const movingAverage3Month =
    last3Keys.length > 0
      ? Math.round((last3Keys.reduce((sum, k) => sum + (counts.get(k) ?? 0), 0) / last3Keys.length) * 10) / 10
      : 0;

  let peakKey = '';
  let peakCount = 0;
  for (const [k, c] of counts) {
    if (c > peakCount) {
      peakKey = k;
      peakCount = c;
    }
  }
  const peakMonth = {
    label: peakKey ? monthLabel(peakKey) : 'ไม่มีข้อมูล',
    count: peakCount,
    percentOfYear: total > 0 ? Math.round((peakCount / total) * 1000) / 10 : 0,
  };

  const casesWithCaseType = cases.filter((c) => (c.case_type ?? '').trim());
  const repeatCaseType = percentOf(
    casesWithCaseType.filter((c) => c.case_type === 'เหตุเดิม').length,
    casesWithCaseType.length,
  );

  const statusNormal = movingAverage3Month === 0 ? true : latestCount <= movingAverage3Month * 1.5;

  return {
    total,
    distinctDrivers,
    avgPerMonth: Math.round((total / 12) * 10) / 10,
    avgPerDriver: distinctDrivers > 0 ? Math.round((total / distinctDrivers) * 10) / 10 : 0,
    repeatComplaints,
    latestMonth: { label: latestKey ? monthLabel(latestKey) : 'ไม่มีข้อมูล', count: latestCount, trendPercent },
    severePenalty,
    inactiveEmployees,
    ytdMonthsWithData,
    ytdAvgPerMonth,
    movingAverage3Month,
    peakMonth,
    repeatCaseType,
    statusNormal,
    category: mostCommonValue(cases.map((c) => c.category), total),
    complaintType: mostCommonValue(cases.map((c) => c.complaint_type), total),
    rootCause: mostCommonValue(cases.map((c) => c.root_cause), total),
    correctiveAction: mostCommonValue(cases.map((c) => c.corrective_action), total),
  };
}
