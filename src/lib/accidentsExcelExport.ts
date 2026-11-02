import { format } from 'date-fns';
import { downloadExcelFile } from '@/lib/exportExcel';
import type { AccidentCase } from '@/types';

function toSheetRow(c: AccidentCase) {
  return {
    วันที่เกิดเหตุ: c.case_date,
    'ชื่อ-นามสกุล': c.employee_name,
    สถานะพนักงานขับรถ: c.driver_status ?? '',
    ลักษณะงาน: c.job_type ?? '',
    จังหวัด: c.province ?? '',
    อายุงาน: c.years_of_service ?? '',
    อายุพนักงาน: c.employee_age ?? '',
    สถานะเคส: c.case_status ?? '',
    ช่วงเวลาที่เกิดเหตุ: c.time_range ?? '',
    'วันทำงาน/วันหยุด': c.work_day_type ?? '',
    รุ่นรถ: c.vehicle_model ?? '',
    ประเภทอุบัติเหตุ: c.accident_type ?? '',
    ลักษณะการเคลื่อนที่: c.movement_detail ?? '',
    ชื่อสถานที่เกิดเหตุ: c.location_name ?? '',
    รายละเอียดสถานที่เกิดเหตุ: c.location_detail ?? '',
    ต้นเหตุ: c.root_cause ?? '',
    รายละเอียดสาเหตุ: c.cause_detail ?? '',
    รายละเอียดเคส: c.case_detail ?? '',
    บทลงโทษ: c.penalty ?? '',
    ผู้แจ้งเหตุ: c.reporter_name ?? '',
    เบอร์โทรผู้แจ้งเหตุ: c.reporter_phone ?? '',
    วันที่บันทึก: c.created_at,
    วันที่แก้ไขล่าสุด: c.updated_at,
  };
}

/** ส่งออกเคสอุบัติเหตุทั้งหมดเป็น Excel ชีตเดียวรวมทุกคอลัมน์ ไม่แยกชีต (ตามที่ผู้ใช้เลือกไว้) */
export function exportAccidentsExcel(cases: AccidentCase[]): void {
  const filename = `accidents-${format(new Date(), 'yyyy-MM-dd')}`;
  downloadExcelFile(filename, [{ sheetName: 'เคสอุบัติเหตุ', rows: cases.map(toSheetRow) }]);
}
