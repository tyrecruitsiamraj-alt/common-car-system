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
};

function toSheetRow(r: IssueReportRow) {
  return {
    วันที่: r.report_date ?? '',
    พนักงาน: r.employee_name ?? '',
    ตำแหน่ง: r.position ?? '',
    ผู้แจ้ง: r.reporter_name ?? '',
    เบอร์โทรผู้แจ้ง: r.reporter_phone ?? '',
    รายละเอียด: summarizeIssueReportRow(r),
    มีอุบัติเหตุ: r.related_accident ? 'ใช่' : 'ไม่ใช่',
  };
}

export function exportComplaintsOverviewExcel(allRows: IssueReportRow[], period: PeriodKey): void {
  const byCategory = ISSUE_REPORT_TYPES.map((t) => ({
    config: t,
    rows: filterByPeriod(
      allRows.filter((r) => r.category === t.slug),
      period,
    ),
  }));

  const summaryRows = byCategory.map(({ config, rows }) => ({
    หมวด: config.label,
    จำนวนเคส: rows.length,
    จำนวนพนักงานที่เกี่ยวข้อง: new Set(rows.map((r) => r.employee_name).filter(Boolean)).size,
    เกี่ยวข้องกับอุบัติเหตุ: rows.filter((r) => r.related_accident).length,
  }));

  const sheets = [
    { sheetName: 'สรุป', rows: summaryRows },
    ...byCategory.map(({ config, rows }) => ({
      sheetName: config.label,
      rows: rows.map(toSheetRow),
    })),
  ];

  const filename = `complaints-overview-${PERIOD_FILE_LABEL[period]}-${format(new Date(), 'yyyy-MM-dd')}`;
  downloadExcelFile(filename, sheets);
}
