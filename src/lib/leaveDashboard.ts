/**
 * Logic ของ Dashboard การลา (`/leaves`) — ข้อมูลมาจาก issue_reports หมวด leave
 * นับเฉพาะพนักงานที่ตำแหน่งปัจจุบันในทะเบียนเป็นคนขับ (ทุกประเภทในหน้า Drivers) และไม่ได้ลาออก/พ้นสภาพ
 * คนที่พ้นสภาพแล้วไม่นับเลย รวมถึงรายการลาออก/เกษียณของคนนั้น ตามที่เจ้าของระบบกำหนด
 * ส่วนตำแหน่งที่เลือกในฟอร์มไม่นำมาใช้ เพราะฟอร์มไม่ได้ตรวจกับทะเบียน
 */
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { normCode, normName } from '@/lib/driverIncidentMatch';
import { isDriverDirectoryPosition } from '@/lib/driverListPositions';
import type { CategoryBucket } from '@/lib/caseReportStats';
import type { IssueReportRow } from '@/lib/issueReportStats';
import { formatEmployeeDisplayName } from '@/lib/titlePrefixOptions';
import { toYmdLocal } from '@/lib/dateTh';
import type { DriverTmaProfile, Employee, EmployeeStatus } from '@/types';

export const LEAVE_TYPES = [
  'พักร้อน',
  'ลาป่วย',
  'ลากิจ',
  'ลาพิเศษ',
  'Day Off',
  'เปลี่ยนตัว',
  'เกษียณ',
  'ลาออก',
  'อื่นๆ',
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

/**
 * สีประจำประเภทที่ใช้ทุกกราฟ ใช้ชุดสี categorical 8 สีตามลำดับที่ตรวจเรื่องตาบอดสีแล้ว
 * ประเภทที่ 9 "อื่นๆ" ใช้สีเทา เพราะชุดสีมีได้ไม่เกิน 8 สี สีต้องผูกกับประเภทเสมอ ห้ามเปลี่ยนตามลำดับยอด
 */
export const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  พักร้อน: '#2a78d6',
  ลาป่วย: '#eb6834',
  ลากิจ: '#1baf7a',
  ลาพิเศษ: '#eda100',
  'Day Off': '#e87ba4',
  เปลี่ยนตัว: '#008300',
  เกษียณ: '#6250d6',
  ลาออก: '#e34948',
  อื่นๆ: '#898781',
};

const OTHER_LEAVE_TYPE: LeaveType = 'อื่นๆ';

/** ชื่อที่ฟอร์มเก็บไว้ต่างจากชื่อบน Dashboard — ฟอร์มใช้ "ลากิจพิเศษ" แต่ Dashboard แสดงเป็น "ลาพิเศษ" */
const LEAVE_TYPE_ALIASES: Record<string, LeaveType> = { ลากิจพิเศษ: 'ลาพิเศษ' };

/** ค่าที่ไม่รู้จักหรือว่างเปล่าจะเข้า "อื่นๆ" เพื่อให้ยอดรวมของทุกประเภทเท่ากับจำนวนรายการเสมอ */
export function normalizeLeaveType(raw: string | null | undefined): LeaveType {
  const value = (raw ?? '').trim();
  const lower = value.toLowerCase();
  const known = LEAVE_TYPES.find((t) => t.toLowerCase() === lower);
  return known ?? LEAVE_TYPE_ALIASES[value] ?? OTHER_LEAVE_TYPE;
}

export type LeaveRecord = {
  id: string;
  date?: string;
  employeeId: string;
  employeeCode: string;
  englishName?: string;
  thaiName: string;
  /** ตำแหน่งปัจจุบันในทะเบียน เช่น Common Driver */
  position: string;
  employeeStatus: EmployeeStatus;
  leaveType: LeaveType;
  reason?: string;
  supervisorName?: string;
  coverPersonName?: string;
  /** รหัสและชื่ออังกฤษของคนแทน มีเมื่อชื่อคนแทนตรงกับทะเบียนเพียงคนเดียว */
  substituteCode?: string;
  substituteEnglishName?: string;
  substitutePhone?: string;
  lineId?: string;
  driverPictureUrl?: string;
  createdAt: string;
  /** แถวต้นทาง ใช้ตอนแก้ไขรายการ */
  source: IssueReportRow;
};

export type LeaveDataset = {
  records: LeaveRecord[];
  /** รายการที่จับคู่พนักงานได้ แต่ตำแหน่งปัจจุบันไม่ใช่คนขับ */
  excludedNotDriver: number;
  /** รายการของคนขับที่ลาออก/พ้นสภาพแล้ว */
  excludedInactive: number;
  /** รายการที่จับคู่กับทะเบียนไม่ได้ หรือชื่อซ้ำจนระบุตัวไม่ได้ */
  excludedUnmatched: number;
};

function groupBy(employees: Employee[], keyOf: (e: Employee) => string): Map<string, Employee[]> {
  const groups = new Map<string, Employee[]>();
  for (const e of employees) {
    const key = keyOf(e);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return groups;
}

/**
 * จับคู่จากทั้งทะเบียน ไม่ใช่เฉพาะคนขับที่ยังทำงาน — ถ้ารหัสเป็นของคนอื่น แต่ชื่อบังเอิญตรงกับคนขับ
 * การจับคู่จากรายชื่อที่กรองแล้วอย่างเดียวจะนับผิดคน
 * ลำดับ: รหัสพนักงาน → ชื่อไทยที่ตรงเพียงคนเดียว ถ้าชื่อซ้ำให้ถือว่าจับคู่ไม่ได้ เพื่อไม่ให้เดาคน
 */
function matchEmployee(
  row: IssueReportRow,
  byCode: Map<string, Employee[]>,
  byName: Map<string, Employee[]>,
): Employee | null {
  const name = normName(row.employee_name);
  const codeHits = byCode.get(normCode(row.employee_id)) ?? [];
  if (codeHits.length === 1) return codeHits[0];
  if (codeHits.length > 1) {
    const sameName = codeHits.filter((e) => normName(`${e.first_name} ${e.last_name}`) === name);
    return sameName.length === 1 ? sameName[0] : null;
  }
  const nameHits = byName.get(name) ?? [];
  return nameHits.length === 1 ? nameHits[0] : null;
}

function optionalText(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

type EnglishNameOf = (employee: Employee) => string | undefined;

function toLeaveRecord(
  row: IssueReportRow,
  employee: Employee,
  byName: Map<string, Employee[]>,
  profiles: Map<string, DriverTmaProfile>,
  englishNameOf: EnglishNameOf,
): LeaveRecord {
  const profile = profiles.get(employee.id);
  const coverPersonName = optionalText(row.data?.cover_person_name);
  const coverHits = byName.get(normName(coverPersonName)) ?? [];
  const substitute = coverPersonName && coverHits.length === 1 ? coverHits[0] : undefined;
  const rawType = row.data?.leave_type;
  const leaveType = normalizeLeaveType(rawType);
  // ถ้าไม่ได้กรอกเหตุผล แต่ค่าเดิมเป็นประเภทที่ไม่รู้จัก ให้เก็บค่านั้นไว้เป็นเหตุผล จะได้ไม่เสียข้อมูล
  const fallbackReason = rawType === OTHER_LEAVE_TYPE ? undefined : optionalText(rawType);
  return {
    id: row.id,
    date: row.report_date,
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    englishName: englishNameOf(employee),
    thaiName: formatEmployeeDisplayName(employee),
    position: employee.position ?? '',
    employeeStatus: employee.status,
    leaveType,
    reason: leaveType === OTHER_LEAVE_TYPE ? optionalText(row.data?.leave_reason) ?? fallbackReason : undefined,
    supervisorName: optionalText(row.data?.supervisor_name),
    coverPersonName,
    substituteCode: substitute?.employee_code,
    substituteEnglishName: substitute ? englishNameOf(substitute) : undefined,
    substitutePhone: optionalText(row.data?.cover_phone),
    lineId: optionalText(profile?.line_id),
    driverPictureUrl: optionalText(profile?.driver_picture_url),
    createdAt: row.created_at,
    source: row,
  };
}

export function buildLeaveDataset(
  rows: IssueReportRow[],
  employees: Employee[],
  tmaProfiles: DriverTmaProfile[] = [],
): LeaveDataset {
  const profiles = new Map(
    tmaProfiles.flatMap((p) => (p.employee_id ? ([[p.employee_id, p]] as [string, DriverTmaProfile][]) : [])),
  );
  /** ชื่ออังกฤษ: ใช้จากทะเบียนก่อน ถ้าไม่มีจึงใช้จาก Database TMA */
  const englishNameOf: EnglishNameOf = (e) =>
    optionalText(e.english_name) ?? optionalText(profiles.get(e.id)?.driver_name_eng);
  const byCode = groupBy(employees, (e) => normCode(e.employee_code));
  const byName = groupBy(employees, (e) => normName(`${e.first_name} ${e.last_name}`));

  const records: LeaveRecord[] = [];
  let excludedNotDriver = 0;
  let excludedInactive = 0;
  let excludedUnmatched = 0;
  for (const row of rows) {
    const employee = matchEmployee(row, byCode, byName);
    if (!employee) excludedUnmatched += 1;
    else if (!isDriverDirectoryPosition(employee.position)) excludedNotDriver += 1;
    else if (employee.status === 'inactive') excludedInactive += 1;
    else records.push(toLeaveRecord(row, employee, byName, profiles, englishNameOf));
  }
  return { records, excludedNotDriver, excludedInactive, excludedUnmatched };
}

export function formatLeaveDate(ymd: string | undefined): string {
  if (!ymd) return '—';
  try {
    return format(parseISO(ymd), 'd MMM yyyy', { locale: th });
  } catch {
    return ymd;
  }
}

/** ชื่อที่ใช้แสดง: ภาษาอังกฤษก่อน ถ้าทะเบียนยังไม่มีจึงใช้ชื่อไทย */
export function leaveRecordName(record: LeaveRecord): string {
  return record.englishName ?? record.thaiName;
}

export function countDistinctEmployees(records: LeaveRecord[]): number {
  return new Set(records.map((r) => r.employeeId)).size;
}

/** นับทุกประเภทตามลำดับคงที่ รวมประเภทที่ยอดเป็น 0 ด้วย */
export function countByLeaveType(records: LeaveRecord[]): CategoryBucket[] {
  return LEAVE_TYPES.map((label) => ({
    label,
    count: records.filter((r) => r.leaveType === label).length,
  }));
}

/** ประเภทที่พบมากสุด ถ้ายังไม่มีรายการจะได้ null */
export function topLeaveType(records: LeaveRecord[]): CategoryBucket | null {
  return countByLeaveType(records).reduce<CategoryBucket | null>(
    (top, bucket) => (bucket.count > (top?.count ?? 0) ? bucket : top),
    null,
  );
}

export type LeaveEmployeeSummary = {
  employeeId: string;
  employeeCode: string;
  name: string;
  records: LeaveRecord[];
};

/** สรุปรายคน เรียงจากคนที่มีรายการมากสุด */
export function groupLeaveByEmployee(records: LeaveRecord[]): LeaveEmployeeSummary[] {
  const groups = new Map<string, LeaveEmployeeSummary>();
  for (const record of records) {
    const group = groups.get(record.employeeId) ?? {
      employeeId: record.employeeId,
      employeeCode: record.employeeCode,
      name: leaveRecordName(record),
      records: [],
    };
    group.records.push(record);
    groups.set(record.employeeId, group);
  }
  return [...groups.values()].sort((a, b) => b.records.length - a.records.length);
}

/** จุดที่มีค่าสูงสุดของกราฟแนวโน้ม ถ้าทุกจุดเป็น 0 จะได้ -1 เพื่อไม่ต้องแสดง badge */
export function findPeakIndex(points: { count: number }[]): number {
  let peak = -1;
  let max = 0;
  points.forEach((point, index) => {
    if (point.count > max) {
      max = point.count;
      peak = index;
    }
  });
  return peak;
}

export type LeaveFilters = {
  from?: string;
  to?: string;
  types: LeaveType[];
  employeeId: string;
  status: EmployeeStatus | 'all';
  supervisor: string;
};

export const EMPTY_LEAVE_FILTERS: LeaveFilters = {
  types: [],
  employeeId: '',
  status: 'all',
  supervisor: '',
};

export function hasActiveLeaveFilters(f: LeaveFilters): boolean {
  return Boolean(f.from || f.to || f.types.length || f.employeeId || f.supervisor || f.status !== 'all');
}

/** เมื่อเลือกช่วงวันที่ รายการที่ไม่มีวันที่ลาจะไม่ถูกนับ */
export function applyLeaveFilters(records: LeaveRecord[], f: LeaveFilters): LeaveRecord[] {
  return records.filter((r) => {
    if (f.from && (!r.date || r.date < f.from)) return false;
    if (f.to && (!r.date || r.date > f.to)) return false;
    if (f.types.length > 0 && !f.types.includes(r.leaveType)) return false;
    if (f.employeeId && r.employeeId !== f.employeeId) return false;
    if (f.status !== 'all' && r.employeeStatus !== f.status) return false;
    if (f.supervisor && r.supervisorName !== f.supervisor) return false;
    return true;
  });
}

export function withoutDateFilter(f: LeaveFilters): LeaveFilters {
  return { ...f, from: undefined, to: undefined };
}

export type LeaveQuickRange = 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'all';

export function quickLeaveRange(key: LeaveQuickRange, now = new Date()): { from?: string; to?: string } {
  switch (key) {
    case 'today':
      return { from: toYmdLocal(now), to: toYmdLocal(now) };
    case 'last7':
      return { from: toYmdLocal(subDays(now, 6)), to: toYmdLocal(now) };
    case 'thisMonth':
      return { from: toYmdLocal(startOfMonth(now)), to: toYmdLocal(endOfMonth(now)) };
    case 'lastMonth': {
      const previous = subMonths(now, 1);
      return { from: toYmdLocal(startOfMonth(previous)), to: toYmdLocal(endOfMonth(previous)) };
    }
    case 'all':
    default:
      return {};
  }
}

export type LeaveTypeCounts = Record<LeaveType, number>;

/** จุดของกราฟแนวโน้ม: ยอดรวมและยอดแยกตามประเภท */
export type LeaveTrendPoint = { label: string; count: number; byType: LeaveTypeCounts };

export type LeaveDailyPoint = LeaveTrendPoint & { ymd: string };

function emptyTypeCounts(): LeaveTypeCounts {
  return Object.fromEntries(LEAVE_TYPES.map((t) => [t, 0])) as LeaveTypeCounts;
}

function countByKeyAndType(records: LeaveRecord[], keyOf: (date: string) => string): Map<string, LeaveTypeCounts> {
  const buckets = new Map<string, LeaveTypeCounts>();
  for (const r of records) {
    if (!r.date) continue;
    const key = keyOf(r.date);
    const counts = buckets.get(key) ?? emptyTypeCounts();
    counts[r.leaveType] += 1;
    buckets.set(key, counts);
  }
  return buckets;
}

function trendPoint(label: string, counts: LeaveTypeCounts | undefined): LeaveTrendPoint {
  const byType = counts ?? emptyTypeCounts();
  const count = LEAVE_TYPES.reduce((sum, t) => sum + byType[t], 0);
  return { label, count, byType };
}

/** จำนวนรายการของทุกวันในช่วง รวมวันที่ไม่มีรายการด้วย */
export function buildDailySeries(records: LeaveRecord[], fromYmd: string, toYmd: string): LeaveDailyPoint[] {
  if (fromYmd > toYmd) return [];
  const buckets = countByKeyAndType(records, (date) => date);
  return eachDayOfInterval({ start: parseISO(fromYmd), end: parseISO(toYmd) }).map((day) => {
    const ymd = toYmdLocal(day);
    return { ymd, ...trendPoint(format(day, 'd MMM', { locale: th }), buckets.get(ymd)) };
  });
}

/** จำนวนรายการรายเดือน N เดือนล่าสุด รวมเดือนปัจจุบัน แยกตามประเภท */
export function buildMonthlyLeaveTrend(records: LeaveRecord[], now = new Date(), months = 6): LeaveTrendPoint[] {
  const buckets = countByKeyAndType(records, (date) => date.slice(0, 7));
  return Array.from({ length: months }, (_, i) => {
    const month = startOfMonth(subMonths(now, months - 1 - i));
    return trendPoint(format(month, 'MMM yy', { locale: th }), buckets.get(format(month, 'yyyy-MM')));
  });
}

/** ช่วงเริ่มต้นของกราฟรายวันเมื่อยังไม่เลือกวันที่: 30 วันล่าสุด */
export function defaultDailyRange(now = new Date()): { from: string; to: string } {
  return { from: toYmdLocal(subDays(now, 29)), to: toYmdLocal(now) };
}

/** ช่วงที่ซูมเมื่อกดวันบนกราฟ: วันนั้น -2 ถึง +2 วัน */
export function dailyZoomRange(ymd: string): { from: string; to: string } {
  const day = parseISO(ymd);
  return { from: toYmdLocal(subDays(day, 2)), to: toYmdLocal(addDays(day, 2)) };
}
