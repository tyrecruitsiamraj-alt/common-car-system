/**
 * Logic ของ Dashboard การลา (`/leaves`) — ข้อมูลมาจาก issue_reports หมวด leave
 * นับเฉพาะพนักงานที่ตำแหน่งปัจจุบันในทะเบียนเป็น Common Driver รวมคนที่พ้นสภาพแล้ว
 * (ไม่อย่างนั้นประเภทลาออก/เกษียณจะหายไป) ส่วนตำแหน่งที่เลือกในฟอร์มไม่นำมาใช้ เพราะฟอร์มไม่ได้ตรวจกับทะเบียน
 */
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { normCode, normName } from '@/lib/driverIncidentMatch';
import { isCommonDriverPosition } from '@/lib/driverListPositions';
import type { CategoryBucket } from '@/lib/caseReportStats';
import type { IssueReportRow } from '@/lib/issueReportStats';
import { formatEmployeeDisplayName } from '@/lib/titlePrefixOptions';
import type { Employee, EmployeeStatus } from '@/types';

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
  employeeStatus: EmployeeStatus;
  leaveType: LeaveType;
  reason?: string;
  supervisorName?: string;
  coverPersonName?: string;
  createdAt: string;
};

export type LeaveDataset = {
  records: LeaveRecord[];
  /** รายการที่จับคู่พนักงานได้ แต่ตำแหน่งปัจจุบันไม่ใช่ Common Driver */
  excludedNotCommon: number;
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
 * จับคู่จากทั้งทะเบียน ไม่ใช่เฉพาะ Common — ถ้ารหัสเป็นของคนตำแหน่งอื่น แต่ชื่อบังเอิญตรงกับคน Common
 * การจับคู่จากรายชื่อ Common อย่างเดียวจะนับผิดคน
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

function toLeaveRecord(row: IssueReportRow, employee: Employee): LeaveRecord {
  const rawType = row.data?.leave_type;
  const leaveType = normalizeLeaveType(rawType);
  // ถ้าไม่ได้กรอกเหตุผล แต่ค่าเดิมเป็นประเภทที่ไม่รู้จัก ให้เก็บค่านั้นไว้เป็นเหตุผล จะได้ไม่เสียข้อมูล
  const fallbackReason = rawType === OTHER_LEAVE_TYPE ? undefined : optionalText(rawType);
  return {
    id: row.id,
    date: row.report_date,
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    englishName: optionalText(employee.english_name),
    thaiName: formatEmployeeDisplayName(employee),
    employeeStatus: employee.status,
    leaveType,
    reason: leaveType === OTHER_LEAVE_TYPE ? optionalText(row.data?.leave_reason) ?? fallbackReason : undefined,
    supervisorName: optionalText(row.data?.supervisor_name),
    coverPersonName: optionalText(row.data?.cover_person_name),
    createdAt: row.created_at,
  };
}

export function buildLeaveDataset(rows: IssueReportRow[], employees: Employee[]): LeaveDataset {
  const byCode = groupBy(employees, (e) => normCode(e.employee_code));
  const byName = groupBy(employees, (e) => normName(`${e.first_name} ${e.last_name}`));

  const records: LeaveRecord[] = [];
  let excludedNotCommon = 0;
  let excludedUnmatched = 0;
  for (const row of rows) {
    const employee = matchEmployee(row, byCode, byName);
    if (!employee) excludedUnmatched += 1;
    else if (!isCommonDriverPosition(employee.position)) excludedNotCommon += 1;
    else records.push(toLeaveRecord(row, employee));
  }
  return { records, excludedNotCommon, excludedUnmatched };
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
