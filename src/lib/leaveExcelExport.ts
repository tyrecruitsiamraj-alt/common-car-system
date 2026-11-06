import { format } from 'date-fns';
import { downloadExcelFile, ymdToExcelSerial, type ExcelSheetInput } from '@/lib/exportExcel';
import type { LeaveRecord, LeaveType } from '@/lib/leaveDashboard';

/** ชื่อประเภทการลาภาษาอังกฤษในไฟล์ Excel */
const LEAVE_TYPE_ENGLISH: Record<LeaveType, string> = {
  พักร้อน: 'Annual Leave',
  ลาป่วย: 'Sick Leave',
  ลากิจ: 'Private Leave',
  ลาพิเศษ: 'Special Leave',
  'Day Off': 'Day Off',
  เปลี่ยนตัว: 'Driver Replacement',
  เกษียณ: 'Retirement',
  ลาออก: 'Resignation',
  อื่นๆ: 'Other',
};

const COLUMN_WIDTHS: Record<string, number> = {
  ID: 10,
  'Driver Name Eng': 26,
  Date: 11,
  'Leave Type': 18,
  'Leave Detail': 24,
  'User Name': 12,
  Substitute_ID: 13,
  Substitute_Name: 24,
  Substitute_Tel: 14,
  Line: 16,
  'Driver Pic': 40,
};

function toSheetRow(r: LeaveRecord) {
  return {
    ID: r.employeeCode,
    // ทะเบียนบางคนยังไม่มีชื่ออังกฤษ จึงใช้ชื่อไทยแทน เพื่อไม่ให้ช่องชื่อว่าง
    'Driver Name Eng': r.englishName ?? r.thaiName,
    Date: ymdToExcelSerial(r.date),
    'Leave Type': LEAVE_TYPE_ENGLISH[r.leaveType],
    'Leave Detail': r.reason ?? r.leaveType,
    // ตามแบบเดิมที่ใช้ "Common" แทน "Common Driver"
    'User Name': r.position.replace(/ Driver$/, ''),
    Substitute_ID: r.substituteCode ?? '',
    Substitute_Name: r.substituteEnglishName ?? r.coverPersonName ?? '',
    Substitute_Tel: r.substitutePhone ?? '',
    Line: r.lineId ?? '',
    'Driver Pic': r.driverPictureUrl ?? '',
  };
}

/** ชีตเดียวตามแบบฟอร์มของผู้ใช้ เรียงตามรหัสพนักงาน แล้วเรียงวันที่จากเก่าไปใหม่ */
export function buildLeaveExcelSheets(records: LeaveRecord[]): ExcelSheetInput[] {
  const sorted = [...records].sort(
    (a, b) => a.employeeCode.localeCompare(b.employeeCode) || (a.date ?? '').localeCompare(b.date ?? ''),
  );
  return [
    {
      sheetName: 'Leave',
      rows: sorted.map(toSheetRow),
      format: { dateColumns: ['Date'], dateFormat: 'd-mmm-yy', columnWidths: COLUMN_WIDTHS, autoFilter: true },
    },
  ];
}

export function exportLeavesExcel(records: LeaveRecord[]): void {
  downloadExcelFile(`leaves-${format(new Date(), 'yyyy-MM-dd')}`, buildLeaveExcelSheets(records));
}
