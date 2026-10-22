import type { LucideIcon } from 'lucide-react';
import { Wrench, UserX, CalendarOff, Gauge } from 'lucide-react';

export type IssueFieldType = 'text' | 'date' | 'textarea' | 'select' | 'employee-picker' | 'computed-days';

export type IssueField = {
  key: string;
  label: string;
  type: IssueFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  /** type: 'select' — เมื่อเลือกค่านี้ ให้โชว์ช่องกรอกเพิ่มเติม (เช่น เลือก "อื่นๆ") */
  otherTrigger?: string;
  otherField?: { key: string; label: string; placeholder?: string };
  /** type: 'employee-picker' — คีย์ของฟิลด์ที่จะเติมรหัสพนักงานอัตโนมัติเมื่อเลือกชื่อ */
  linkedCodeField?: string;
  /**
   * type: 'computed-days' — คำนวณจำนวนวัน (รวมวันเริ่ม-สิ้นสุด) จากอีก 2 ฟิลด์วันที่
   * subtractDays: หักออกจากผลรวม (เช่น "จำนวนวันที่ใช้ได้" ต้องหักวันที่บิน+วันที่กลับออก 2 วัน เพราะ 2 วันนี้ไม่ว่าง)
   */
  computeDaysFrom?: { startKey: string; endKey: string; subtractDays?: number };
};

export type IssueReportConfig = {
  slug: string;
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
  fields: IssueField[];
  /** คีย์ของฟิลด์วันที่หลัก — ใช้กรองตามช่วงเวลา (วัน/สัปดาห์/เดือน/ปี) ในหน้าภาพรวม */
  primaryDateField: string;
};

/** หมวดหมู่ย่อยของแบบฟอร์ม — เมนูซ้าย > แบบฟอร์ม — เนื้อหา/ฟิลด์ปรับได้ภายหลัง */
export const ISSUE_REPORT_TYPES: IssueReportConfig[] = [
  {
    slug: 'vehicle-service',
    path: '/complaints/vehicle-service',
    label: 'รถเข้าศูนย์',
    icon: Wrench,
    description: 'แจ้งข้อมูลเมื่อรถต้องนำเข้าศูนย์บริการ',
    primaryDateField: 'report_date',
    fields: [
      { key: 'report_date', label: 'วันที่', type: 'date', required: true },
      { key: 'employee_name', label: 'ชื่อ-นามสกุล', type: 'employee-picker', required: true },
      { key: 'vehicle_plate', label: 'ทะเบียนรถ', type: 'text', required: true, placeholder: 'เช่น กข 1234' },
      {
        key: 'vehicle_model',
        label: 'รุ่นรถ',
        type: 'select',
        required: true,
        options: ['Fortuner', 'Camry', 'Cross', 'Majesty', 'Alphard', 'Ventury', 'Commuter', 'Innova'],
      },
      { key: 'mileage', label: 'เลขไมล์', type: 'text', required: true, placeholder: 'เช่น 45,000' },
      {
        key: 'service_type',
        label: 'ประเภทการเข้าศูนย์',
        type: 'select',
        required: true,
        options: ['เช็คระยะ', 'เปลี่ยนยาง', 'เปลี่ยนแบตเตอรี่', 'อื่นๆ'],
        otherTrigger: 'อื่นๆ',
        otherField: { key: 'service_type_other', label: 'ระบุประเภทการเข้าศูนย์', placeholder: 'ระบุรายละเอียด' },
      },
      {
        key: 'service_center',
        label: 'ชื่อศูนย์',
        type: 'select',
        required: true,
        options: [
          'โตโยต้านครธนบางบ่อ',
          'โตโยต้าวันบางปะกง',
          'โตโยต้าวรจักรยนต์สมุทรปราการ',
          'เคมอเตอร์สุขุมวิท 43',
          'PBS กม.25',
        ],
      },
      {
        key: 'status',
        label: 'สถานะ',
        type: 'select',
        required: true,
        options: ['เข้าศูนย์ตามแผน', 'เลื่อน', 'ยกเลิก'],
      },
    ],
  },
  {
    slug: 'supervisor-absent',
    path: '/complaints/supervisor-absent',
    label: 'นายบิน',
    icon: UserX,
    description: 'แจ้งกรณีผู้บังคับบัญชา/นายบินปฏิบัติงาน',
    primaryDateField: 'start_date',
    fields: [
      { key: 'employee_id', label: 'รหัส ID', type: 'text', placeholder: 'เติมอัตโนมัติเมื่อเลือกชื่อ' },
      {
        key: 'position',
        label: 'ตำแหน่ง',
        type: 'select',
        required: true,
        options: ['Position', 'Common', 'Support Driver', 'TEMP'],
      },
      {
        key: 'employee_name',
        label: 'ชื่อ-นามสกุลพนักงาน',
        type: 'employee-picker',
        required: true,
        linkedCodeField: 'employee_id',
      },
      { key: 'supervisor_name', label: 'ชื่อ-นามสกุลนาย', type: 'text', required: true },
      { key: 'start_date', label: 'วันที่บิน', type: 'date', required: true },
      { key: 'end_date', label: 'วันที่กลับ', type: 'date', required: true },
      {
        key: 'total_days',
        label: 'รวมจำนวนวันบิน',
        type: 'computed-days',
        computeDaysFrom: { startKey: 'start_date', endKey: 'end_date' },
      },
      {
        key: 'usable_days',
        label: 'จำนวนวันที่ใช้ได้',
        type: 'computed-days',
        computeDaysFrom: { startKey: 'start_date', endKey: 'end_date', subtractDays: 2 },
      },
      {
        key: 'employee_status',
        label: 'สถานะพนักงาน',
        type: 'select',
        required: true,
        options: ['บริการ Family', 'ว่าง'],
      },
      {
        key: 'cover_type',
        label: 'แทนงาน/วิ่งงานส่วนกลาง',
        type: 'select',
        required: true,
        options: ['แทนงาน', 'วิ่งงานส่วนกลาง'],
      },
      { key: 'cover_date', label: 'วันที่แทน', type: 'date', required: true },
      { key: 'cover_person_name', label: 'ชื่อคนลางาน', type: 'text', required: true },
    ],
  },
  {
    slug: 'leave',
    path: '/complaints/leave',
    label: 'การลา',
    icon: CalendarOff,
    description: 'แจ้งข้อมูลการลาของพนักงาน',
    primaryDateField: 'leave_date',
    fields: [
      { key: 'employee_id', label: 'รหัส ID', type: 'text', placeholder: 'เติมอัตโนมัติเมื่อเลือกชื่อ' },
      {
        key: 'position',
        label: 'ตำแหน่ง',
        type: 'select',
        required: true,
        options: ['Position', 'Common', 'Support Driver', 'TEMP'],
      },
      {
        key: 'employee_name',
        label: 'ชื่อ-นามสกุล',
        type: 'employee-picker',
        required: true,
        linkedCodeField: 'employee_id',
      },
      { key: 'leave_phone', label: 'เบอร์โทรคนลางาน', type: 'text', required: true },
      { key: 'leave_date', label: 'วันที่ลา', type: 'date', required: true },
      {
        key: 'leave_type',
        label: 'ประเภทการลา',
        type: 'select',
        required: true,
        options: ['พักร้อน', 'ลาป่วย', 'ลากิจ', 'ลากิจพิเศษ', 'Day Off', 'เปลี่ยนตัว', 'เกษียณ', 'ลาออก', 'อื่นๆ'],
        otherTrigger: 'อื่นๆ',
        otherField: { key: 'leave_reason', label: 'เหตุผลการลา', placeholder: 'ระบุเหตุผล' },
      },
      { key: 'supervisor_name', label: 'ชื่อนาย', type: 'text' },
      { key: 'cover_person_name', label: 'ชื่อคนแทน', type: 'text', required: true },
      { key: 'cover_phone', label: 'เบอร์โทรคนแทน', type: 'text', required: true },
    ],
  },
  {
    slug: 'speed',
    path: '/complaints/speed',
    label: 'ความเร็ว',
    icon: Gauge,
    description: 'แจ้งเหตุขับรถเร็วเกินกำหนด',
    primaryDateField: 'report_date',
    fields: [
      { key: 'report_date', label: 'วันที่', type: 'date', required: true },
      { key: 'employee_name', label: 'ชื่อ-นามสกุล', type: 'employee-picker', required: true },
      {
        key: 'position',
        label: 'ตำแหน่ง',
        type: 'select',
        required: true,
        options: ['Position', 'Common', 'Support Driver', 'TEMP'],
      },
      { key: 'vehicle_plate', label: 'ทะเบียนรถ', type: 'text', required: true, placeholder: 'เช่น กข 1234' },
      {
        key: 'vehicle_model',
        label: 'รุ่นรถ',
        type: 'select',
        required: true,
        options: ['Fortuner', 'Camry', 'Cross', 'Majesty', 'Alphard', 'Ventury', 'Commuter', 'Innova'],
      },
      {
        key: 'detection_method',
        label: 'ความเร็ว',
        type: 'select',
        required: true,
        options: ['GPS', 'ใบสั่งจราจร'],
      },
      {
        key: 'repeat_status',
        label: 'การเกิดซ้ำ',
        type: 'select',
        required: true,
        options: ['ซ้ำ', 'ไม่ซ้ำ'],
      },
      { key: 'speed_over', label: 'ความเร็วที่ขับเกิน', type: 'text', required: true, placeholder: 'เช่น 120 กม./ชม.' },
      { key: 'speed_reason', label: 'เหตุผลที่ขับเร็ว', type: 'text', required: true },
    ],
  },
];
