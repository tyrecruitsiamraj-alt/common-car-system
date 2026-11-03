import type { LucideIcon } from 'lucide-react';
import { Wrench, UserX, CalendarOff, Gauge, Smile } from 'lucide-react';

export type IssueFieldType =
  | 'text'
  | 'date'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'employee-picker'
  | 'vehicle-model-picker'
  | 'computed-days';

/** ตัวคั่นค่าที่เลือกหลายรายการของ type: 'multi-select' เมื่อเก็บเป็น string เดียว (ไม่ใช้ ", " เพราะตัวเลือกบางอันมีคอมมาอยู่แล้ว) */
export const MULTI_SELECT_SEPARATOR = '|||';

/** แปลง string ที่เก็บค่า multi-select กลับเป็นรายการตัวเลือกที่เลือกไว้ */
export function parseMultiSelectValue(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  return raw.split(MULTI_SELECT_SEPARATOR).map((s) => s.trim()).filter(Boolean);
}

/** แปลงรายการตัวเลือกที่เลือกไว้กลับเป็น string เดียวสำหรับเก็บลง data */
export function formatMultiSelectValue(values: string[]): string {
  return values.join(MULTI_SELECT_SEPARATOR);
}

export type IssueField = {
  key: string;
  label: string;
  type: IssueFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  /**
   * type: 'select' | 'multi-select' — ใช้แทน `options` เมื่อตัวเลือกของฟิลด์นี้ขึ้นกับค่าที่เลือกไว้ของอีกฟิลด์หนึ่ง
   * (เช่น รายการย่อยของ "ประเภทการเข้าศูนย์" ขึ้นกับ "หมวดหลัก" ที่เลือกไว้)
   * optionsDependOn = คีย์ของฟิลด์ควบคุม, optionsByGroup = ตัวเลือกของแต่ละค่าที่เป็นไปได้ของฟิลด์ควบคุมนั้น
   * เมื่อเปลี่ยนค่าของฟิลด์ควบคุม ฟิลด์ที่ขึ้นกับมันจะถูกล้างค่าอัตโนมัติ (ตัวเลือกเก่าอาจไม่ตรงหมวดใหม่แล้ว)
   */
  optionsDependOn?: string;
  optionsByGroup?: Record<string, string[]>;
  /** type: 'select' | 'multi-select' — เมื่อเลือกค่านี้ ให้โชว์ช่องกรอกเพิ่มเติม (เช่น เลือก "อื่นๆ") */
  otherTrigger?: string;
  otherField?: { key: string; label: string; placeholder?: string };
  /** type: 'employee-picker' — คีย์ของฟิลด์ที่จะเติมรหัสพนักงานอัตโนมัติเมื่อเลือกชื่อ */
  linkedCodeField?: string;
  /** type: 'vehicle-model-picker' — เลือกรุ่นรถ Toyota + รุ่นย่อย/เกรด (Model) เหมือนหน้า /fleet/vehicles */
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
  /** 'forms' (ค่าเริ่มต้น) = อยู่ใต้ dropdown "แบบฟอร์ม" เมนูซ้าย, 'standalone' = แยกเป็นปุ่มเมนูของตัวเอง */
  menuGroup?: 'forms' | 'standalone';
};

/** หมวดหลัก (สาเหตุที่เข้าศูนย์) ของแบบฟอร์ม "รถเข้าศูนย์" — บอกภาพรวมว่าเป็นแผนปกติหรือปัญหาที่ต้องติดตาม */
export const SERVICE_CATEGORY_OPTIONS = ['ซ่อมบำรุงตามแผน', 'ชำรุด-ซ่อมฉุกเฉิน', 'อุบัติเหตุ'];

/** รายการย่อยของ "ประเภทการเข้าศูนย์" แยกตามหมวดหลักที่เลือก — เลือกได้มากกว่า 1 ข้อในหมวดเดียวกัน */
export const SERVICE_TYPE_OPTIONS_BY_CATEGORY: Record<string, string[]> = {
  'ซ่อมบำรุงตามแผน': ['เช็คระยะ', 'เปลี่ยนยาง', 'เปลี่ยนแบตเตอรี่', 'เปลี่ยนน้ำมันเครื่อง', 'ล้างแอร์', 'อื่นๆ'],
  'ชำรุด-ซ่อมฉุกเฉิน': ['เครื่องยนต์', 'ระบบไฟฟ้า', 'ระบบเบรก', 'ระบบแอร์', 'ยางรั่ว/แตก', 'แบตเตอรี่หมด/เสีย', 'อื่นๆ'],
  อุบัติเหตุ: ['ชนท้าย', 'ชนด้านหน้า', 'ชนด้านข้าง', 'พลิกคว่ำ', 'กระจก/ไฟหน้า-ไฟท้ายแตก', 'อื่นๆ'],
};

/** เกณฑ์คะแนน 1-5 ของแบบประเมินความพึงพอใจ */
const SATISFACTION_SCORE_OPTIONS = [
  '5 - ดีเยี่ยม (Excellent)',
  '4 - ดี (Good)',
  '3 - ปานกลาง/พอใช้ (Fair)',
  '2 - ควรปรับปรุง (Poor)',
  '1 - ปรับปรุงเร่งด่วน (Very Poor)',
];

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
      { key: 'vehicle_model', label: 'รุ่นรถ', type: 'vehicle-model-picker', required: true },
      { key: 'mileage', label: 'เลขไมล์', type: 'text', required: true, placeholder: 'เช่น 45,000' },
      {
        key: 'service_category',
        label: 'หมวดหลัก (สาเหตุที่เข้าศูนย์)',
        type: 'select',
        required: true,
        options: SERVICE_CATEGORY_OPTIONS,
      },
      {
        key: 'service_type',
        label: 'ประเภทการเข้าศูนย์ (เลือกได้มากกว่า 1 ข้อ)',
        type: 'multi-select',
        required: true,
        placeholder: 'กรุณาเลือกหมวดหลักก่อน',
        optionsDependOn: 'service_category',
        optionsByGroup: SERVICE_TYPE_OPTIONS_BY_CATEGORY,
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
          'TBS กม.25',
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
      { key: 'vehicle_model', label: 'รุ่นรถ', type: 'vehicle-model-picker', required: true },
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
  {
    slug: 'satisfaction',
    path: '/complaints/satisfaction',
    label: 'แบบประเมินความพึงพอใจ',
    icon: Smile,
    description: 'แบบประเมินความพึงพอใจของผู้ใช้บริการต่อพนักงานขับรถ',
    primaryDateField: 'service_date',
    menuGroup: 'standalone',
    fields: [
      { key: 'vehicle_plate', label: 'ทะเบียนรถ', type: 'text', required: true, placeholder: 'เช่น กข 1234' },
      { key: 'driver_name', label: 'ชื่อ พขร.', type: 'text', required: true },
      { key: 'service_date', label: 'วันที่ใช้บริการ', type: 'date', required: true },
      {
        key: 'courtesy_score',
        label: 'ความสุภาพและบริการ (กิริยามารยาท การทักทาย และความพร้อมให้บริการ)',
        type: 'select',
        required: true,
        options: SATISFACTION_SCORE_OPTIONS,
      },
      {
        key: 'safety_score',
        label: 'ความปลอดภัยในการขับขี่ (ขับรถตามกฎจราจร ไม่เร็วหรือหวาดเสียว ไม่ใช้โทรศัพท์ขณะขับขี่)',
        type: 'select',
        required: true,
        options: SATISFACTION_SCORE_OPTIONS,
      },
      {
        key: 'cleanliness_score',
        label: 'ความสะอาดของรถ (สภาพภายในและภายนอกรถสะอาด ไม่มีกลิ่นอับ)',
        type: 'select',
        required: true,
        options: SATISFACTION_SCORE_OPTIONS,
      },
      {
        key: 'punctuality_score',
        label: 'การตรงต่อเวลา (มารับ-ส่งตรงเวลาตามที่นัดหมาย)',
        type: 'select',
        required: true,
        options: SATISFACTION_SCORE_OPTIONS,
      },
      {
        key: 'suggestion',
        label: 'ข้อเสนอแนะอื่นๆ',
        type: 'textarea',
        placeholder: 'สำหรับชมเชยหรือแจ้งเรื่องที่ต้องปรับปรุง',
      },
    ],
  },
];
