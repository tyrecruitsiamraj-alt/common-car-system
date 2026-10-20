/**
 * ข้อมูลตัวอย่าง (mock) สำหรับหน้าภาพรวม Complaints — ยังไม่เชื่อมฐานข้อมูลจริง
 * ใช้แสดงโครง UI/การจัดวางเท่านั้น ตัวเลขจะถูกแทนที่ด้วยข้อมูลจริงภายหลัง
 */

export type PeriodKey = 'day' | 'week' | 'month' | 'year';

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  day: 'วันนี้',
  week: 'สัปดาห์นี้',
  month: 'เดือนนี้',
  year: 'ปีนี้',
};

export type BreakdownItem = { label: string; count: number };

export type PersonCaseSummary = {
  name: string;
  position: string;
  count: number;
  cases: string[];
};

export type VehicleServiceData = {
  total: number;
  cancelled: number;
  postponed: number;
  byModel: BreakdownItem[];
  byCenter: BreakdownItem[];
  byServiceType: BreakdownItem[];
  people: PersonCaseSummary[];
};

export type SupervisorAbsentData = {
  totalPeople: number;
  totalDaysAway: number;
  totalUsableDays: number;
  byStatus: BreakdownItem[];
  people: PersonCaseSummary[];
};

export type LeaveData = {
  totalPeople: number;
  byLeaveType: BreakdownItem[];
  people: PersonCaseSummary[];
};

export type SpeedData = {
  overLimitCount: number;
  byRepeat: BreakdownItem[];
  byReason: BreakdownItem[];
  people: PersonCaseSummary[];
};

export type ComplaintsOverviewData = {
  vehicleService: VehicleServiceData;
  supervisorAbsent: SupervisorAbsentData;
  leave: LeaveData;
  speed: SpeedData;
};

export const COMPLAINTS_OVERVIEW_MOCK: Record<PeriodKey, ComplaintsOverviewData> = {
  day: {
    vehicleService: {
      total: 3,
      cancelled: 0,
      postponed: 1,
      byModel: [
        { label: 'Fortuner', count: 1 },
        { label: 'Camry', count: 1 },
        { label: 'Innova', count: 1 },
      ],
      byCenter: [
        { label: 'โตโยต้านครธนบางบ่อ', count: 1 },
        { label: 'เคมอเตอร์สุขุมวิท 43', count: 1 },
        { label: 'PBS กม.25', count: 1 },
      ],
      byServiceType: [
        { label: 'เช็คระยะ', count: 2 },
        { label: 'เปลี่ยนยาง', count: 1 },
      ],
      people: [
        { name: 'สมชาย ใจดี', position: 'Position', count: 1, cases: ['เช็คระยะ — Fortuner (กข 1234)'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 1, cases: ['เปลี่ยนยาง — Camry (คค 5678)'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 1, cases: ['เช็คระยะ — Innova (งง 9012)'] },
      ],
    },
    supervisorAbsent: {
      totalPeople: 1,
      totalDaysAway: 2,
      totalUsableDays: 2,
      byStatus: [
        { label: 'บริการ Family', count: 1 },
        { label: 'แทนงาน', count: 1 },
        { label: 'ว่าง', count: 0 },
      ],
      people: [{ name: 'กาญจนา แสงทอง', position: 'Common', count: 1, cases: ['บิน 2 วัน — แทนงานโดย อนุชา รุ่งเรือง'] }],
    },
    leave: {
      totalPeople: 2,
      byLeaveType: [
        { label: 'ลาป่วย', count: 1 },
        { label: 'ลากิจ', count: 1 },
      ],
      people: [
        { name: 'สมศักดิ์ พลศรี', position: 'Position', count: 1, cases: ['ลาป่วย'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 1, cases: ['ลากิจ'] },
      ],
    },
    speed: {
      overLimitCount: 1,
      byRepeat: [
        { label: 'ซ้ำ', count: 0 },
        { label: 'ไม่ซ้ำ', count: 1 },
      ],
      byReason: [{ label: 'เร่งเวลาส่งงาน', count: 1 }],
      people: [{ name: 'สมหญิง รักษ์ดี', position: 'Common', count: 1, cases: ['เกิน 128 กม./ชม. — เร่งเวลาส่งงาน'] }],
    },
  },
  week: {
    vehicleService: {
      total: 11,
      cancelled: 1,
      postponed: 2,
      byModel: [
        { label: 'Fortuner', count: 4 },
        { label: 'Camry', count: 3 },
        { label: 'Innova', count: 2 },
        { label: 'Commuter', count: 2 },
      ],
      byCenter: [
        { label: 'โตโยต้านครธนบางบ่อ', count: 4 },
        { label: 'โตโยต้าวันบางปะกง', count: 2 },
        { label: 'เคมอเตอร์สุขุมวิท 43', count: 3 },
        { label: 'PBS กม.25', count: 2 },
      ],
      byServiceType: [
        { label: 'เช็คระยะ', count: 5 },
        { label: 'เปลี่ยนยาง', count: 3 },
        { label: 'เปลี่ยนแบตเตอรี่', count: 2 },
        { label: 'อื่นๆ', count: 1 },
      ],
      people: [
        { name: 'สมชาย ใจดี', position: 'Position', count: 3, cases: ['เช็คระยะ — Fortuner', 'เปลี่ยนยาง — Fortuner'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 3, cases: ['เช็คระยะ — Camry', 'เปลี่ยนแบตเตอรี่ — Camry'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 2, cases: ['เช็คระยะ — Innova'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 2, cases: ['เปลี่ยนยาง — Commuter'] },
        { name: 'กาญจนา แสงทอง', position: 'Common', count: 1, cases: ['อื่นๆ — Commuter'] },
      ],
    },
    supervisorAbsent: {
      totalPeople: 3,
      totalDaysAway: 9,
      totalUsableDays: 8,
      byStatus: [
        { label: 'บริการ Family', count: 2 },
        { label: 'แทนงาน', count: 2 },
        { label: 'ว่าง', count: 1 },
      ],
      people: [
        { name: 'กาญจนา แสงทอง', position: 'Common', count: 1, cases: ['บิน 3 วัน — แทนงานโดย อนุชา รุ่งเรือง'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 1, cases: ['บิน 4 วัน — ว่าง'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 1, cases: ['บิน 2 วัน — แทนงานโดย สมศักดิ์ พลศรี'] },
      ],
    },
    leave: {
      totalPeople: 6,
      byLeaveType: [
        { label: 'พักร้อน', count: 2 },
        { label: 'ลาป่วย', count: 2 },
        { label: 'ลากิจ', count: 1 },
        { label: 'ลาออก', count: 1 },
      ],
      people: [
        { name: 'สมศักดิ์ พลศรี', position: 'Position', count: 1, cases: ['พักร้อน'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 1, cases: ['ลาป่วย'] },
        { name: 'สมหญิง รักษ์ดี', position: 'Common', count: 1, cases: ['ลากิจ'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 1, cases: ['พักร้อน'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 1, cases: ['ลาป่วย'] },
        { name: 'กาญจนา แสงทอง', position: 'Common', count: 1, cases: ['ลาออก'] },
      ],
    },
    speed: {
      overLimitCount: 4,
      byRepeat: [
        { label: 'ซ้ำ', count: 1 },
        { label: 'ไม่ซ้ำ', count: 3 },
      ],
      byReason: [
        { label: 'เร่งเวลาส่งงาน', count: 2 },
        { label: 'ถนนโล่ง', count: 1 },
        { label: 'ไม่ทราบความเร็ว', count: 1 },
      ],
      people: [
        { name: 'สมหญิง รักษ์ดี', position: 'Common', count: 2, cases: ['เกิน 128 กม./ชม. — เร่งเวลาส่งงาน', 'เกิน 135 กม./ชม. — เร่งเวลาส่งงาน (ซ้ำ)'] },
        { name: 'สมชาย ใจดี', position: 'Position', count: 1, cases: ['เกิน 122 กม./ชม. — ถนนโล่ง'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 1, cases: ['เกิน 130 กม./ชม. — ไม่ทราบความเร็ว'] },
      ],
    },
  },
  month: {
    vehicleService: {
      total: 42,
      cancelled: 3,
      postponed: 6,
      byModel: [
        { label: 'Fortuner', count: 15 },
        { label: 'Camry', count: 10 },
        { label: 'Innova', count: 9 },
        { label: 'Commuter', count: 8 },
      ],
      byCenter: [
        { label: 'โตโยต้านครธนบางบ่อ', count: 14 },
        { label: 'โตโยต้าวันบางปะกง', count: 8 },
        { label: 'โตโยต้าวรจักรยนต์สมุทรปราการ', count: 6 },
        { label: 'เคมอเตอร์สุขุมวิท 43', count: 9 },
        { label: 'PBS กม.25', count: 5 },
      ],
      byServiceType: [
        { label: 'เช็คระยะ', count: 19 },
        { label: 'เปลี่ยนยาง', count: 11 },
        { label: 'เปลี่ยนแบตเตอรี่', count: 8 },
        { label: 'อื่นๆ', count: 4 },
      ],
      people: [
        { name: 'สมชาย ใจดี', position: 'Position', count: 9, cases: ['เช็คระยะ ×4', 'เปลี่ยนยาง ×3', 'อื่นๆ ×2'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 8, cases: ['เช็คระยะ ×5', 'เปลี่ยนแบตเตอรี่ ×3'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 7, cases: ['เช็คระยะ ×4', 'เปลี่ยนยาง ×3'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 7, cases: ['เปลี่ยนยาง ×3', 'เช็คระยะ ×4'] },
        { name: 'กาญจนา แสงทอง', position: 'Common', count: 6, cases: ['เปลี่ยนแบตเตอรี่ ×4', 'เช็คระยะ ×2'] },
        { name: 'สมศักดิ์ พลศรี', position: 'Position', count: 5, cases: ['เช็คระยะ ×4', 'อื่นๆ ×1'] },
      ],
    },
    supervisorAbsent: {
      totalPeople: 8,
      totalDaysAway: 34,
      totalUsableDays: 30,
      byStatus: [
        { label: 'บริการ Family', count: 5 },
        { label: 'แทนงาน', count: 6 },
        { label: 'ว่าง', count: 2 },
      ],
      people: [
        { name: 'กาญจนา แสงทอง', position: 'Common', count: 2, cases: ['บิน 3 วัน — แทนงาน', 'บิน 2 วัน — แทนงาน'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 2, cases: ['บิน 4 วัน — ว่าง', 'บิน 5 วัน — แทนงาน'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 1, cases: ['บิน 6 วัน — แทนงาน'] },
        { name: 'สมศักดิ์ พลศรี', position: 'Position', count: 1, cases: ['บิน 5 วัน — ว่าง'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 1, cases: ['บิน 4 วัน — แทนงาน'] },
        { name: 'สมชาย ใจดี', position: 'Position', count: 1, cases: ['บิน 5 วัน — แทนงาน'] },
      ],
    },
    leave: {
      totalPeople: 23,
      byLeaveType: [
        { label: 'พักร้อน', count: 7 },
        { label: 'ลาป่วย', count: 8 },
        { label: 'ลากิจ', count: 4 },
        { label: 'ลากิจพิเศษ', count: 1 },
        { label: 'Day Off', count: 1 },
        { label: 'เปลี่ยนตัว', count: 1 },
        { label: 'ลาออก', count: 1 },
      ],
      people: [
        { name: 'สมศักดิ์ พลศรี', position: 'Position', count: 3, cases: ['ลาป่วย ×2', 'ลากิจ ×1'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 3, cases: ['พักร้อน ×2', 'ลาป่วย ×1'] },
        { name: 'สมหญิง รักษ์ดี', position: 'Common', count: 2, cases: ['ลากิจ ×1', 'พักร้อน ×1'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 2, cases: ['พักร้อน ×1', 'ลาป่วย ×1'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 2, cases: ['ลาป่วย ×2'] },
        { name: 'กาญจนา แสงทอง', position: 'Common', count: 1, cases: ['ลาออก ×1'] },
      ],
    },
    speed: {
      overLimitCount: 15,
      byRepeat: [
        { label: 'ซ้ำ', count: 4 },
        { label: 'ไม่ซ้ำ', count: 11 },
      ],
      byReason: [
        { label: 'เร่งเวลาส่งงาน', count: 7 },
        { label: 'ถนนโล่ง', count: 4 },
        { label: 'ไม่ทราบความเร็ว', count: 3 },
        { label: 'อื่นๆ', count: 1 },
      ],
      people: [
        { name: 'สมหญิง รักษ์ดี', position: 'Common', count: 5, cases: ['เกิน 120–135 กม./ชม. ×5 (ซ้ำ 2 ครั้ง)'] },
        { name: 'สมชาย ใจดี', position: 'Position', count: 4, cases: ['เกิน 122–128 กม./ชม. ×4'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 3, cases: ['เกิน 125–130 กม./ชม. ×3'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 3, cases: ['เกิน 121–140 กม./ชม. ×3 (ซ้ำ 2 ครั้ง)'] },
      ],
    },
  },
  year: {
    vehicleService: {
      total: 468,
      cancelled: 28,
      postponed: 61,
      byModel: [
        { label: 'Fortuner', count: 168 },
        { label: 'Camry', count: 112 },
        { label: 'Innova', count: 101 },
        { label: 'Commuter', count: 87 },
      ],
      byCenter: [
        { label: 'โตโยต้านครธนบางบ่อ', count: 156 },
        { label: 'โตโยต้าวันบางปะกง', count: 92 },
        { label: 'โตโยต้าวรจักรยนต์สมุทรปราการ', count: 68 },
        { label: 'เคมอเตอร์สุขุมวิท 43', count: 101 },
        { label: 'PBS กม.25', count: 51 },
      ],
      byServiceType: [
        { label: 'เช็คระยะ', count: 211 },
        { label: 'เปลี่ยนยาง', count: 124 },
        { label: 'เปลี่ยนแบตเตอรี่', count: 89 },
        { label: 'อื่นๆ', count: 44 },
      ],
      people: [
        { name: 'สมชาย ใจดี', position: 'Position', count: 98, cases: ['เช็คระยะ, เปลี่ยนยาง, อื่นๆ — รวม 12 เดือน'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 87, cases: ['เช็คระยะ, เปลี่ยนแบตเตอรี่ — รวม 12 เดือน'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 79, cases: ['เช็คระยะ, เปลี่ยนยาง — รวม 12 เดือน'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 74, cases: ['เปลี่ยนยาง, เช็คระยะ — รวม 12 เดือน'] },
        { name: 'กาญจนา แสงทอง', position: 'Common', count: 68, cases: ['เปลี่ยนแบตเตอรี่, เช็คระยะ — รวม 12 เดือน'] },
        { name: 'สมศักดิ์ พลศรี', position: 'Position', count: 62, cases: ['เช็คระยะ, อื่นๆ — รวม 12 เดือน'] },
      ],
    },
    supervisorAbsent: {
      totalPeople: 19,
      totalDaysAway: 382,
      totalUsableDays: 340,
      byStatus: [
        { label: 'บริการ Family', count: 11 },
        { label: 'แทนงาน', count: 15 },
        { label: 'ว่าง', count: 4 },
      ],
      people: [
        { name: 'กาญจนา แสงทอง', position: 'Common', count: 24, cases: ['บิน รวม 48 วัน ตลอดปี'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 21, cases: ['บิน รวม 44 วัน ตลอดปี'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 18, cases: ['บิน รวม 38 วัน ตลอดปี'] },
        { name: 'สมศักดิ์ พลศรี', position: 'Position', count: 16, cases: ['บิน รวม 35 วัน ตลอดปี'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 14, cases: ['บิน รวม 30 วัน ตลอดปี'] },
      ],
    },
    leave: {
      totalPeople: 211,
      byLeaveType: [
        { label: 'พักร้อน', count: 74 },
        { label: 'ลาป่วย', count: 81 },
        { label: 'ลากิจ', count: 38 },
        { label: 'ลากิจพิเศษ', count: 7 },
        { label: 'Day Off', count: 5 },
        { label: 'เปลี่ยนตัว', count: 3 },
        { label: 'เกษียณ', count: 1 },
        { label: 'ลาออก', count: 2 },
      ],
      people: [
        { name: 'สมศักดิ์ พลศรี', position: 'Position', count: 14, cases: ['ลาป่วย, ลากิจ, พักร้อน — รวม 12 เดือน'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 13, cases: ['พักร้อน, ลาป่วย — รวม 12 เดือน'] },
        { name: 'สมหญิง รักษ์ดี', position: 'Common', count: 11, cases: ['ลากิจ, พักร้อน — รวม 12 เดือน'] },
        { name: 'วิไล สวยงาม', position: 'Common', count: 10, cases: ['พักร้อน, ลาป่วย — รวม 12 เดือน'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 9, cases: ['ลาป่วย — รวม 12 เดือน'] },
      ],
    },
    speed: {
      overLimitCount: 142,
      byRepeat: [
        { label: 'ซ้ำ', count: 39 },
        { label: 'ไม่ซ้ำ', count: 103 },
      ],
      byReason: [
        { label: 'เร่งเวลาส่งงาน', count: 62 },
        { label: 'ถนนโล่ง', count: 41 },
        { label: 'ไม่ทราบความเร็ว', count: 28 },
        { label: 'อื่นๆ', count: 11 },
      ],
      people: [
        { name: 'สมหญิง รักษ์ดี', position: 'Common', count: 41, cases: ['เกิน 120+ กม./ชม. รวม 41 ครั้ง (ซ้ำ 14 ครั้ง)'] },
        { name: 'สมชาย ใจดี', position: 'Position', count: 33, cases: ['เกิน 120+ กม./ชม. รวม 33 ครั้ง (ซ้ำ 9 ครั้ง)'] },
        { name: 'ประยุทธ มั่นคง', position: 'Support Driver', count: 28, cases: ['เกิน 120+ กม./ชม. รวม 28 ครั้ง (ซ้ำ 8 ครั้ง)'] },
        { name: 'อนุชา รุ่งเรือง', position: 'TEMP', count: 24, cases: ['เกิน 120+ กม./ชม. รวม 24 ครั้ง (ซ้ำ 5 ครั้ง)'] },
      ],
    },
  },
};
