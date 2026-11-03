import { format } from 'date-fns';
import { downloadExcelFile, type ExcelSheetInput } from '@/lib/exportExcel';
import { WORK_HOURS_PERIOD_LABELS, type WorkHoursSummaryResponse } from '@/lib/workHoursConfig';

function buildOverviewSheet(data: WorkHoursSummaryResponse): Record<string, string | number>[] {
  return [
    { รายการ: 'ช่วงเวลา', ค่า: WORK_HOURS_PERIOD_LABELS[data.period] },
    { รายการ: 'ตั้งแต่วันที่', ค่า: data.from },
    { รายการ: 'ถึงวันที่', ค่า: data.to },
    { รายการ: 'อัตรา OT 1.5 เท่า (บาท/ชม.)', ค่า: data.settings.ot_rate_1_5x },
    { รายการ: 'อัตรา OT 3 เท่า วันหยุด (บาท/ชม.)', ค่า: data.settings.ot_rate_3x },
    { รายการ: 'เกณฑ์ชั่วโมงทำงานเต็มเวลา (ชม./วัน)', ค่า: data.settings.full_time_threshold_hours },
    { รายการ: 'จำนวนพนักงานทั้งหมด (คน)', ค่า: data.summary.total_employees },
    { รายการ: 'วิ่งงาน เกินเกณฑ์ (คน)', ค่า: data.summary.active_count },
    { รายการ: 'ว่าง ไม่เกินเกณฑ์ (คน)', ค่า: data.summary.idle_count },
    { รายการ: 'ชั่วโมงทำงานปกติรวม (ชม.)', ค่า: data.summary.total_normal_hours },
    { รายการ: 'ชั่วโมง OT รวม (ชม.)', ค่า: data.summary.total_ot_hours },
    { รายการ: 'ประมาณการค่า OT รวม (บาท)', ค่า: data.summary.estimated_ot_cost },
    { รายการ: 'วันที่ออกรายงาน', ค่า: format(new Date(), 'd MMM yyyy HH:mm') },
  ];
}

function buildEmployeeSheet(data: WorkHoursSummaryResponse) {
  return data.employees.map((e) => ({
    ชื่อพนักงาน: e.name,
    ตำแหน่ง: e.position,
    'ชม.รวม': e.total_hours,
    'ชม.ทำงานปกติ': e.normal_hours,
    'ชม. OT': e.ot_hours,
    'ค่า OT โดยประมาณ (บาท)': e.ot_cost,
    จำนวนวันที่ทำงาน: e.days_worked,
    'เฉลี่ย ชม./วัน': e.avg_hours_per_day,
    สถานะ: e.status === 'active' ? 'วิ่งงาน' : 'ว่าง',
  }));
}

function buildDailySheet(data: WorkHoursSummaryResponse) {
  return (data.daily ?? []).map((d) => ({
    วันที่: d.date,
    ชื่อพนักงาน: d.employee_name,
    ทะเบียนรถ: d.vehicle_plate ?? '-',
    เวลาเริ่มงาน: d.starts_at,
    เวลาปิดงาน: d.completed_at,
    'ชม.รวม': d.total_hours,
    'ชม.ปกติ': d.normal_hours,
    'ชม. OT': d.ot_hours,
    'ค่า OT (บาท)': d.ot_cost,
    วันหยุด: d.is_holiday ? 'ใช่' : '',
  }));
}

/** ส่งออกสรุปชั่วโมงทำงาน/ค่า OT ของช่วงที่เลือกเป็น Excel — ใช้เก็บเป็นประวัติ/อ้างอิงตอนตรวจสอบ */
export function exportWorkHoursExcel(data: WorkHoursSummaryResponse): void {
  const sheets: ExcelSheetInput[] = [
    { sheetName: 'สรุปภาพรวม', rows: buildOverviewSheet(data) },
    { sheetName: 'รายพนักงาน', rows: buildEmployeeSheet(data) },
    { sheetName: 'รายละเอียดรายวัน', rows: buildDailySheet(data) },
  ];
  const filename = `work-hours-${data.from}_to_${data.to}`;
  downloadExcelFile(filename, sheets);
}
