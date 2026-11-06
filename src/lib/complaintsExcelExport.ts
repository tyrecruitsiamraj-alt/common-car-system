import { format } from 'date-fns';
import { downloadExcelFile } from '@/lib/exportExcel';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';
import { filterByPeriod, summarizeIssueReportRow, type IssueReportRow } from '@/lib/issueReportStats';
import type { PeriodKey } from '@/lib/complaintsOverviewMockData';

const PERIOD_FILE_LABEL: Record<PeriodKey, string> = {
  day: 'today',
  week: 'week',
  month: 'month',
  year: 'year',
  all: 'all',
  custom: 'custom',
};

function toSheetRow(r: IssueReportRow) {
  return {
    วันที่: r.report_date ?? '',
    พนักงาน: r.employee_name ?? '',
    ตำแหน่ง: r.position ?? '',
    ผู้แจ้ง: r.reporter_name ?? '',
    เบอร์โทรผู้แจ้ง: r.reporter_phone ?? '',
    รายละเอียด: summarizeIssueReportRow(r),
  };
}

export function exportComplaintsOverviewExcel(
  allRows: IssueReportRow[],
  period: PeriodKey,
  customFromYmd?: string,
  customToYmd?: string,
): void {
  const byCategory = ISSUE_REPORT_TYPES.map((t) => ({
    config: t,
    rows: filterByPeriod(
      allRows.filter((r) => r.category === t.slug),
      period,
      new Date(),
      customFromYmd,
      customToYmd,
    ),
  }));

  const summaryRows = byCategory.map(({ config, rows }) => ({
    หมวด: config.label,
    จำนวนเคส: rows.length,
    จำนวนพนักงานที่เกี่ยวข้อง: new Set(rows.map((r) => r.employee_name).filter(Boolean)).size,
  }));

  const sheets = [
    { sheetName: 'สรุป', rows: summaryRows },
    ...byCategory.map(({ config, rows }) => ({
      sheetName: config.label,
      rows: rows.map(toSheetRow),
    })),
  ];

  const periodTag =
    period === 'custom' && customFromYmd && customToYmd
      ? `${customFromYmd}_to_${customToYmd}`
      : PERIOD_FILE_LABEL[period];
  const filename = `complaints-overview-${periodTag}-${format(new Date(), 'yyyy-MM-dd')}`;
  downloadExcelFile(filename, sheets);
}
