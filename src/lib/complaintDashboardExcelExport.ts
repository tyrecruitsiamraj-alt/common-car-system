import { format } from 'date-fns';
import { downloadExcelFile, type ExcelSheetInput } from '@/lib/exportExcel';
import type { CategoryBucket, TopValueSummary } from '@/lib/caseReportStats';
import type { ComplaintYearStats } from '@/lib/complaintDashboardStats';
import type { Complaint } from '@/types';

function formatTopValue(top: TopValueSummary | null, unit = 'เคส'): string {
  return top ? `${top.label} (${top.count} ${unit}, ${top.percent}%)` : 'ไม่มีข้อมูล';
}

function buildSummarySheet(
  stats: ComplaintYearStats,
  selectedYear: number | null,
  yearsOfService: TopValueSummary | null,
  employeeAge: TopValueSummary | null,
): Record<string, string | number>[] {
  return [
    { ลำดับ: 1, ตัวชี้วัด: `เคสร้องเรียนทั้งหมด ปี ${selectedYear ?? ''}`, ค่า: stats.total },
    { ลำดับ: 2, ตัวชี้วัด: 'พนักงานที่ถูกร้องเรียน (คน)', ค่า: stats.distinctDrivers },
    {
      ลำดับ: 3,
      ตัวชี้วัด: 'เคสร้องเรียนซ้ำ (ครั้งที่ 2 ขึ้นไป)',
      ค่า: `${stats.repeatComplaints.percent}% (${stats.repeatComplaints.count} เคส จากพนักงาน ${stats.repeatComplaints.distinctDrivers} คน)`,
    },
    {
      ลำดับ: 4,
      ตัวชี้วัด: `เคสเดือนล่าสุด (${stats.latestMonth.label})`,
      ค่า:
        stats.latestMonth.trendPercent === null
          ? `${stats.latestMonth.count} เคส`
          : `${stats.latestMonth.count} เคส (เทียบเดือนก่อน ${stats.latestMonth.trendPercent > 0 ? '+' : ''}${stats.latestMonth.trendPercent}%)`,
    },
    { ลำดับ: 5, ตัวชี้วัด: 'บทลงโทษระดับรุนแรง', ค่า: `${stats.severePenalty.percent}% (${stats.severePenalty.count} เคส)` },
    {
      ลำดับ: 6,
      ตัวชี้วัด: 'เคสที่พนักงานพ้นสภาพ/ลาออกแล้ว',
      ค่า: `${stats.inactiveEmployees.percent}% (${stats.inactiveEmployees.count} จากทั้งหมด ${stats.total} เคส)`,
    },
    { ลำดับ: 7, ตัวชี้วัด: 'เคสสะสม YTD', ค่า: `${stats.total} (เฉลี่ย ${stats.ytdAvgPerMonth} เคส/เดือน จาก ${stats.ytdMonthsWithData} เดือน)` },
    { ลำดับ: 8, ตัวชี้วัด: 'ค่าเฉลี่ยเคลื่อนที่ 3 เดือน (ล่าสุด)', ค่า: `${stats.movingAverage3Month} เคส/เดือน` },
    { ลำดับ: 9, ตัวชี้วัด: 'เดือนที่มีเคสสูงสุด', ค่า: `${stats.peakMonth.label} (${stats.peakMonth.count} เคส, ${stats.peakMonth.percentOfYear}%)` },
    { ลำดับ: 10, ตัวชี้วัด: 'เหตุการณ์ซ้ำ (ทำผิดซ้ำเดิม)', ค่า: `${stats.repeatCaseType.count} เคส (${stats.repeatCaseType.percent}% ของเคสที่มีข้อมูล)` },
    {
      ลำดับ: 11,
      ตัวชี้วัด: 'สถานะภาพรวมล่าสุด',
      ค่า: `${stats.statusNormal ? 'ปกติ' : 'ผิดปกติ'} (เดือน ${stats.latestMonth.label} = ${stats.latestMonth.count} เคส เทียบค่าเฉลี่ย ${stats.movingAverage3Month} เคส)`,
    },
    { ลำดับ: 12, ตัวชี้วัด: 'หมวดหมู่ที่พบมากสุด', ค่า: formatTopValue(stats.category) },
    { ลำดับ: 13, ตัวชี้วัด: 'ประเภทการร้องเรียนอันดับ 1', ค่า: formatTopValue(stats.complaintType) },
    { ลำดับ: 14, ตัวชี้วัด: 'สาเหตุที่แท้จริงหลัก (Root Cause)', ค่า: formatTopValue(stats.rootCause) },
    { ลำดับ: 15, ตัวชี้วัด: 'มาตรการแก้ไข/ป้องกันมากสุด', ค่า: formatTopValue(stats.correctiveAction) },
    { ลำดับ: 16, ตัวชี้วัด: 'ช่วงอายุงานที่พบมากสุด', ค่า: formatTopValue(yearsOfService) },
    { ลำดับ: 17, ตัวชี้วัด: 'ช่วงอายุพนักงานที่พบมากสุด', ค่า: formatTopValue(employeeAge, 'คน') },
  ];
}

function toCaseRow(c: Complaint) {
  return {
    วันที่ร้องเรียน: c.complaint_date ?? '',
    'ชื่อ-นามสกุล': c.driver_name ?? '',
    รหัสพนักงาน: c.employee_id ?? '',
    ตำแหน่ง: c.position ?? '',
    อายุงาน: c.years_of_service ?? '',
    อายุพนักงาน: c.employee_age ?? '',
    หมวดหมู่: c.category ?? '',
    ประเภทการร้องเรียน: c.complaint_type ?? '',
    รายละเอียด: c.complaint_details ?? '',
    สาเหตุที่แท้จริง: c.root_cause ?? '',
    บทลงโทษ: c.penalty ?? '',
    ครั้งที่: c.occurrence_count ?? '',
    มาตรการแก้ไข: c.corrective_action ?? '',
    สถานะพนักงาน: c.employee_status ?? '',
    ประเภทเหตุการณ์: c.case_type ?? '',
    ผู้แจ้ง: c.reporter_name ?? '',
    เบอร์โทรผู้แจ้ง: c.reporter_phone ?? '',
  };
}

function toBucketRow(b: CategoryBucket) {
  return { รายการ: b.label, จำนวนเคส: b.count };
}

export function exportComplaintDashboardExcel(
  yearCases: Complaint[],
  stats: ComplaintYearStats,
  selectedYear: number | null,
  yearsOfService: TopValueSummary | null,
  employeeAge: TopValueSummary | null,
  trend: { label: string; count: number }[],
  categoryBuckets: CategoryBucket[],
  complaintTypeBuckets: CategoryBucket[],
): void {
  const byCategory = new Map<string, Complaint[]>();
  for (const c of yearCases) {
    const key = (c.category ?? '').trim() || 'ไม่ระบุหมวดหมู่';
    const list = byCategory.get(key) ?? [];
    list.push(c);
    byCategory.set(key, list);
  }

  const sheets: ExcelSheetInput[] = [
    { sheetName: 'สรุปตัวชี้วัด', rows: buildSummarySheet(stats, selectedYear, yearsOfService, employeeAge) },
    { sheetName: 'แนวโน้มรายเดือน', rows: trend.map((t) => ({ เดือน: t.label, จำนวนเคส: t.count })) },
    { sheetName: 'หมวดหมู่ (ภาพรวม)', rows: categoryBuckets.map(toBucketRow) },
    { sheetName: 'ประเภทร้องเรียน (ภาพรวม)', rows: complaintTypeBuckets.map(toBucketRow) },
    ...[...byCategory.entries()].map(([category, list]) => ({
      sheetName: category,
      rows: list.map(toCaseRow),
    })),
  ];

  const filename = `complaint-dashboard-${selectedYear ?? 'all'}-${format(new Date(), 'yyyy-MM-dd')}`;
  downloadExcelFile(filename, sheets);
}
