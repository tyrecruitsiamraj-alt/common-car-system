/**
 * นิยามฟิลด์เสริมจาก Database TMA ที่แก้ไขผ่าน UI ได้ทั้งหมด — ให้ตรงกับหัวตารางในหน้า Drivers (ดู TMA_COLUMNS ใน WLEmployees.tsx)
 * ใช้ชุดเดียวกันทั้งฝั่ง render ฟอร์ม (DriverTmaProfileFields.tsx) และฝั่งแปลงค่า/ส่ง API (driverTmaProfileEdit.ts)
 */
export type DriverTmaProfileFieldType = 'text' | 'date' | 'number';

export type DriverTmaProfileFieldDef = {
  /** key ของ state ในฟอร์ม (camelCase) */
  key: string;
  /** ชื่อคอลัมน์จริงใน driver_tma_profiles ที่ส่งให้ API (snake_case) */
  dbField: string;
  label: string;
  type: DriverTmaProfileFieldType;
  placeholder?: string;
};

export const DRIVER_TMA_PROFILE_FIELD_GROUPS: { title: string; fields: DriverTmaProfileFieldDef[] }[] = [
  {
    title: 'ผู้บังคับบัญชา / ผู้ดูแล',
    fields: [
      { key: 'assignedUserName', dbField: 'assigned_user_name', label: 'ผู้บังคับบัญชา', type: 'text' },
      { key: 'assignedUserTel', dbField: 'assigned_user_tel', label: 'เบอร์ผู้บังคับบัญชา', type: 'text' },
      { key: 'bossType', dbField: 'boss_type', label: 'ประเภทผู้บังคับบัญชา', type: 'text' },
      { key: 'underDriverCo', dbField: 'under_driver_co', label: 'ผู้ดูแล', type: 'text' },
      { key: 'apartment', dbField: 'apartment', label: 'ที่พัก', type: 'text' },
    ],
  },
  {
    title: 'บัตรและวันทำงาน',
    fields: [
      { key: 'tdemCardId', dbField: 'tdem_card_id', label: 'บัตร TDEM', type: 'text' },
      { key: 'cardLast5', dbField: 'card_last5', label: '5 ตัวท้าย', type: 'text' },
      { key: 'startDate', dbField: 'start_date', label: 'วันเริ่มงาน (TMA)', type: 'date' },
      { key: 'endDate', dbField: 'end_date', label: 'วันสิ้นสุดงาน', type: 'date' },
      { key: 'resignationReason', dbField: 'resignation_reason', label: 'เหตุผลลาออก', type: 'text' },
      { key: 'experienceYears', dbField: 'experience_years', label: 'ประสบการณ์ (ปี)', type: 'number' },
      { key: 'sickLeaveLimit', dbField: 'sick_leave_limit', label: 'สิทธิลาป่วย (วัน)', type: 'number' },
      { key: 'privateLeaveLimit', dbField: 'private_leave_limit', label: 'สิทธิลากิจ (วัน)', type: 'number' },
      { key: 'annualLeaveLimit', dbField: 'annual_leave_limit', label: 'สิทธิลาพักร้อน (วัน)', type: 'number' },
    ],
  },
  {
    title: 'ข้อมูล TMA ทั่วไป',
    fields: [
      { key: 'site', dbField: 'site', label: 'ไซต์', type: 'text' },
      { key: 'subSite', dbField: 'sub_site', label: 'ไซต์ย่อย', type: 'text' },
      { key: 'tmaDriverCode', dbField: 'tma_driver_code', label: 'รหัส TMA', type: 'text' },
      { key: 'driverNameEng', dbField: 'driver_name_eng', label: 'ชื่อ (อังกฤษ)', type: 'text' },
      { key: 'tmaStatus', dbField: 'tma_status', label: 'สถานะ (TMA)', type: 'text' },
      { key: 'lineId', dbField: 'line_id', label: 'Line ID', type: 'text' },
    ],
  },
  {
    title: 'รถที่มอบหมาย',
    fields: [
      { key: 'carModel', dbField: 'car_model', label: 'รุ่นรถ', type: 'text' },
      { key: 'carColor', dbField: 'car_color', label: 'สีรถ', type: 'text' },
      { key: 'carNo', dbField: 'car_no', label: 'ทะเบียนรถ', type: 'text' },
      { key: 'carSticker', dbField: 'car_sticker', label: 'เลขสติกเกอร์', type: 'text' },
    ],
  },
  {
    title: 'ข้อมูลส่วนตัว',
    fields: [
      { key: 'birthdate', dbField: 'birthdate', label: 'วันเกิด', type: 'date' },
      { key: 'age', dbField: 'age', label: 'อายุ', type: 'number' },
    ],
  },
  {
    title: 'คะแนนประเมิน',
    fields: [
      { key: 'examScore2025', dbField: 'exam_score_2025', label: 'คะแนนสอบ 2025', type: 'number' },
      { key: 'supervisorScore2025', dbField: 'supervisor_score_2025', label: 'นายประเมิน 2025', type: 'number' },
      { key: 'complainScore', dbField: 'complain_score', label: 'คะแนนร้องเรียน', type: 'number' },
      { key: 'accidentScore', dbField: 'accident_score', label: 'คะแนนอุบัติเหตุ', type: 'number' },
      { key: 'totalScore', dbField: 'total_score', label: 'คะแนนรวม', type: 'number' },
    ],
  },
  {
    title: 'รูปภาพ',
    fields: [
      { key: 'driverPictureUrl', dbField: 'driver_picture_url', label: 'ลิงก์รูปผู้ขับ', type: 'text', placeholder: 'https://...' },
      {
        key: 'driverLicenseImageUrl',
        dbField: 'driver_license_image_url',
        label: 'ลิงก์รูปใบขับขี่',
        type: 'text',
        placeholder: 'https://...',
      },
    ],
  },
];

export const DRIVER_TMA_PROFILE_FIELDS: DriverTmaProfileFieldDef[] = DRIVER_TMA_PROFILE_FIELD_GROUPS.flatMap(
  (g) => g.fields,
);
