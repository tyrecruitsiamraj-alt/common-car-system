/** ตัวเลือกฟิลด์แบบ select ของฟอร์มแจ้งเรื่องร้องเรียน — ใช้ร่วมกันทั้งฟอร์มแจ้งเรื่อง (public) และหน้าแก้ไขเคส (dashboard) */

export const CATEGORY_OPTIONS = [
  'Regulation - กฎระเบียบ',
  'Complain Manner - มารยาทการบริการแย่',
  'Complain Time - ไปล่าช้า เสียเวลา',
  'Complain Safety - ขับขี่อันตราย',
  'Traffic Law - ผิดกฎจราจร',
  'Others - อื่นๆ',
];

export const COMPLAINT_TYPE_OPTIONS = [
  'ลงเวลาเกินจริง',
  'ปัญหากับลูกค้า',
  'ปัญหาการสื่อสาร',
  'แสดงอารมณ์/โต้เถียง',
  'มารับสาย',
  'ไม่ชำนาญเส้นทาง',
  'เบรกกะทันหัน',
  'มาสายบ่อย',
  'จอดติดเครื่องเป็นเวลานาน',
  'ขาด/ลา/หยุดบ่อย',
  'ขับรถเร็วเกินกำหนด',
  'ติดต่อไม่ได้',
  'ประมาทเลินเล่อ',
  'ยืมเงินนาย / User',
  'ไม่มาตามเวลานัด',
  'ไม่ปฏิบัติตามกฎบริษัท',
];

export const POSITION_OPTIONS = ['Position', 'Common'];

export const ROOT_CAUSE_OPTIONS = ['People - ทักษะ/พฤติกรรม', 'Communication - การสื่อสาร'];

export const PENALTY_OPTIONS = [
  'เตือนด้วยวาจา',
  'หนังสือเตือน',
  'หนังสือเตือน/พักงาน',
  'เปลี่ยนตัว',
  'เปลี่ยนตำแหน่งเป็น Common',
];

export const OCCURRENCE_COUNT_OPTIONS = ['ครั้งที่ 1', 'ครั้งที่ 2', 'ครั้งที่ 3', 'ครั้งที่ 4', 'ครั้งที่ 5'];

export const CORRECTIVE_ACTION_OPTIONS = [
  'เน้นย้ำกฎระเบียบ',
  'เน้นย้ำ / แชร์เคส',
  'การฝึกอบรมใหม่',
  'เปลี่ยน Driver',
];

export const EMPLOYEE_STATUS_OPTIONS = ['ทำงานอยู่', 'ลาออก', 'พ้นสภาพ'];

export const CASE_TYPE_OPTIONS = ['เหตุการณ์ใหม่', 'เหตุเดิม'];
