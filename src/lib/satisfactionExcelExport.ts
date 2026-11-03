import { format } from 'date-fns';
import { downloadExcelFile, type ExcelSheetInput } from '@/lib/exportExcel';
import type { IssueReportRow } from '@/lib/issueReportStats';
import {
  SATISFACTION_CRITERIA,
  parseScore,
  scoreGradeLabel,
  computeSatisfactionStats,
  buildSatisfactionMonthlyTrend,
} from '@/lib/satisfactionDashboardStats';

function buildOverviewSheet(rows: IssueReportRow[]): Record<string, string | number>[] {
  const stats = computeSatisfactionStats(rows);
  const sheet: Record<string, string | number>[] = [
    { รายการ: 'จำนวนแบบประเมินทั้งหมด', ค่า: stats.total },
    { รายการ: 'คะแนนเฉลี่ยรวม', ค่า: stats.overallAverage ?? '-' },
    { รายการ: 'ระดับคะแนนเฉลี่ยรวม', ค่า: scoreGradeLabel(stats.overallAverage) },
    { รายการ: '% ได้คะแนนดี-ดีเยี่ยม (4-5)', ค่า: stats.goodPercent },
    { รายการ: '% ควรปรับปรุง (1-2)', ค่า: stats.poorPercent },
    { รายการ: 'จำนวนพนักงานขับรถที่ถูกประเมิน (คน)', ค่า: stats.distinctDrivers },
    { รายการ: 'วันที่ออกรายงาน', ค่า: format(new Date(), 'd MMM yyyy HH:mm') },
  ];
  for (const c of stats.criteriaAverages) {
    sheet.push({ รายการ: `คะแนนเฉลี่ย — ${c.label}`, ค่า: c.average ?? '-' });
  }
  return sheet;
}

function buildTrendSheet(rows: IssueReportRow[]): Record<string, string | number>[] {
  const trend = buildSatisfactionMonthlyTrend(rows, 12);
  return trend.map((t) => ({
    เดือน: t.label,
    จำนวนแบบประเมิน: t.count,
    คะแนนเฉลี่ยรวม: t.overallAverage ?? '-',
    ...Object.fromEntries(SATISFACTION_CRITERIA.map((c) => [c.label, t[c.key] ?? '-'])),
  }));
}

function buildRawSheet(rows: IssueReportRow[]): Record<string, string | number>[] {
  return rows.map((r) => ({
    วันที่ใช้บริการ: r.report_date ?? '-',
    ทะเบียนรถ: r.data.vehicle_plate ?? '-',
    'ชื่อ พขร.': r.data.driver_name ?? '-',
    ...Object.fromEntries(
      SATISFACTION_CRITERIA.map((c) => [c.label, parseScore(r.data[c.key]) ?? '-']),
    ),
    ข้อเสนอแนะ: r.data.suggestion ?? '',
  }));
}

/** ส่งออกผลแบบประเมินความพึงพอใจ (ภาพรวม + แนวโน้มรายเดือน + รายการดิบ) เป็น Excel */
export function exportSatisfactionDashboardExcel(rows: IssueReportRow[]): void {
  const sheets: ExcelSheetInput[] = [
    { sheetName: 'สรุปภาพรวม', rows: buildOverviewSheet(rows) },
    { sheetName: 'แนวโน้มรายเดือน', rows: buildTrendSheet(rows) },
    { sheetName: 'รายการแบบประเมิน', rows: buildRawSheet(rows) },
  ];
  downloadExcelFile(`satisfaction-dashboard-${format(new Date(), 'yyyy-MM-dd')}`, sheets);
}
