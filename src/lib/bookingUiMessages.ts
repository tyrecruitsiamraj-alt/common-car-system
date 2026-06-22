/** ข้อความ UI การจองรถ — แยกความหมาย "ยกเลิก" กับ "ปิดงาน" ให้ชัด */

export const BOOKING_STATUS_LABELS = {
  inProgress: 'กำลังดำเนินการ',
  completed: 'ปิดงานแล้ว',
  cancelled: 'ยกเลิกแล้ว',
} as const;

export const BOOKING_ACTION_LABELS = {
  complete: 'ปิดงาน',
  completeWithTime: 'ปิดงาน (ปรับเวลาก่อน)',
  cancelBooking: 'ยกเลิกการจอง',
  cancelShort: 'ยกเลิก',
  saveAndComplete: 'บันทึกปิดงาน',
  editCompletedTime: 'แก้เวลาปิดงาน',
} as const;

export const BOOKING_CONFIRM = {
  cancel:
    'ยกเลิกการจองนี้?\n\n• ใบจองจะถูกยกเลิก (ไม่ใช่การปิดงาน)\n• รถและพนักงานจะว่างทันทีทั้งช่วงเวลาที่จอง',
  completeNow:
    'ปิดงานตอนนี้?\n\n• ระบบจะบันทึกเวลาปิดเป็นเวลาปัจจุบัน\n• รถและพนักงานจะว่างตั้งแต่เวลาปิดจนถึงเวลาสิ้นสุดที่จอง (ไม่ใช่การยกเลิก)',
  completeWithEdits:
    'บันทึกปิดงานพร้อมช่วงเวลาที่แก้ไข?\n\n• เวลาปิดงานกำหนดจุดที่รถและพนักงานว่าง\n• ช่วงหลังเวลาปิดจนถึงเวลาสิ้นสุดที่จองจะว่าง (ไม่ใช่การยกเลิก)',
  editCompletedTime: 'บันทึกการแก้เวลาปิดงาน? (บันทึกลงประวัติ)',
} as const;

export const BOOKING_TOAST = {
  alreadyCompleted: 'ใบจองนี้ปิดงานแล้ว',
  cannotCancelCompleted: 'ไม่สามารถยกเลิกได้ — ใบจองปิดงานแล้ว (ไม่ใช่การยกเลิก)',
  cannotEditCompleted: 'ไม่สามารถแก้ไขได้ — ใบจองปิดงานแล้ว',
  completeSuccess: 'ปิดงานแล้ว — รถและพนักงานว่างตั้งแต่เวลาปิดงาน',
  completeWithEditsSuccess: 'บันทึกปิดงานแล้ว — รถและพนักงานว่างตั้งแต่เวลาปิดงาน',
  cancelSuccess: 'ยกเลิกการจองแล้ว — รถและพนักงานว่างทันที',
  completeFailed: 'ปิดงานไม่สำเร็จ',
  cancelFailed: 'ยกเลิกการจองไม่สำเร็จ',
  completeNotPersisted:
    'บันทึกแล้วแต่เวลาปิดงานไม่ติด — ติดต่อผู้ดูแลระบบ (คอลัมน์ completed_at)',
  invalidCompletedAt: 'เวลาปิดงานไม่ถูกต้อง',
  noPermissionEditCompletedTime: 'คุณไม่มีสิทธิ์แก้เวลาปิดงาน',
  editCompletedTimeSuccess: 'แก้เวลาปิดงานแล้ว',
} as const;

export const BOOKING_DIALOG = {
  completeTitle: 'ปิดงาน — ปรับเวลาก่อนบันทึก',
  completeDescription:
    'ปรับช่วงเวลาด้านล่างแล้วกด "บันทึกปิดงาน" — ระบบจะบันทึกเวลาปิดงานและปล่อยรถกับพนักงานให้ว่างตั้งแต่เวลานั้น (ไม่ใช่การยกเลิก)',
  completedTimeTitle: 'แก้เวลาปิดงาน',
  completedTimeDescription:
    'แก้เฉพาะเวลาเริ่ม สิ้นสุด และเวลาปิดงาน — บันทึกลงประวัติการแก้ไข',
  completedAtField: 'เวลาปิดงาน',
  completedAtHint:
    'เวลานี้กำหนดจุดที่รถและพนักงานว่าง — แนะนำให้อยู่ในช่วงเริ่ม–สิ้นสุดที่จอง',
  detailCompletedAt: (formatted: string) => `ปิดงานเมื่อ ${formatted}`,
} as const;

export const BOOKING_AVAILABILITY = {
  noEmployees: 'ไม่มีพนักงานว่างในช่วงเวลานี้',
  noVehicles: 'ไม่มีรถว่างในช่วงเวลานี้',
  calculating: 'กำลังคำนวณความว่าง กรุณารอสักครู่',
} as const;

export const BOOKING_NOTIFICATION = {
  overdueTitlePrefix: 'เลยเวลาแล้วยังไม่ปิดงาน:',
  overdueAction: 'กรุณาปิดงานในระบบ (ไม่ใช่การยกเลิก)',
  emptyPanel: 'ไม่มีการจองที่ยังไม่ปิดงาน',
} as const;
