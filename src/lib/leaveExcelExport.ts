import { format } from 'date-fns';
import { downloadExcelFile, type ExcelSheetInput } from '@/lib/exportExcel';
import { LEAVE_TYPES, countDistinctEmployees, type LeaveRecord } from '@/lib/leaveDashboard';
import type { EmployeeStatus } from '@/types';

const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: 'ทำงานอยู่',
  inactive: 'ลาออก/พ้นสภาพ',
  suspended: 'พักงาน',
};

/** ไม่ใส่เบอร์โทร เพราะทุกคนที่ login ดาวน์โหลดไฟล์นี้ได้ */
function toSheetRow(r: LeaveRecord) {
  return {
    วันที่ลา: r.date ?? '',
    รหัสพนักงาน: r.employeeCode,
    'Name (English)': r.englishName ?? '',
    ชื่อภาษาไทย: r.thaiName,
    สถานะพนักงาน: EMPLOYEE_STATUS_LABEL[r.employeeStatus] ?? r.employeeStatus,
    ประเภทการลา: r.leaveType,
    เหตุผล: r.reason ?? '',
    ชื่อนาย: r.supervisorName ?? '',
    ชื่อคนแทน: r.coverPersonName ?? '',
    วันที่บันทึก: r.createdAt,
  };
}

/** ชีตสรุป + แยกชีตตามประเภทการลา ทุกประเภทมีชีตเสมอ แม้ยังไม่มีรายการ */
export function buildLeaveExcelSheets(records: LeaveRecord[]): ExcelSheetInput[] {
  const byType = LEAVE_TYPES.map((leaveType) => ({
    leaveType,
    rows: records.filter((r) => r.leaveType === leaveType),
  }));

  const summaryRows = [
    ...byType.map(({ leaveType, rows }) => ({
      ประเภทการลา: leaveType,
      จำนวนรายการ: rows.length,
      จำนวนพนักงาน: countDistinctEmployees(rows),
    })),
    {
      ประเภทการลา: 'รวม',
      จำนวนรายการ: records.length,
      จำนวนพนักงาน: countDistinctEmployees(records),
    },
  ];

  return [
    { sheetName: 'สรุป', rows: summaryRows },
    ...byType.map(({ leaveType, rows }) => ({ sheetName: leaveType, rows: rows.map(toSheetRow) })),
  ];
}

export function exportLeavesExcel(records: LeaveRecord[]): void {
  downloadExcelFile(`leaves-${format(new Date(), 'yyyy-MM-dd')}`, buildLeaveExcelSheets(records));
}
