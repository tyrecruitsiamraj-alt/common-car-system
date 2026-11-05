import { describe, expect, it } from 'vitest';
import {
  LEAVE_TYPES,
  buildLeaveDataset,
  countByLeaveType,
  countDistinctEmployees,
  findPeakIndex,
  groupLeaveByEmployee,
  leaveRecordName,
  normalizeLeaveType,
  topLeaveType,
} from '@/lib/leaveDashboard';
import { buildLeaveExcelSheets } from '@/lib/leaveExcelExport';
import type { IssueReportRow } from '@/lib/issueReportStats';
import type { Employee } from '@/types';

function emp(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'e1',
    employee_code: 'SR 0001',
    first_name: 'ทดสอบ',
    last_name: 'หนึ่ง',
    english_name: 'Test One',
    phone: '0800000000',
    status: 'active',
    position: 'Common Driver',
    join_date: '2024-01-01',
    reliability_score: 0,
    utilization_rate: 0,
    total_days_worked: 0,
    total_income: 0,
    total_cost: 0,
    total_issues: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function row(overrides: Partial<IssueReportRow> = {}, data: Record<string, string> = {}): IssueReportRow {
  return {
    id: 'r1',
    category: 'leave',
    report_date: '2026-10-15',
    employee_id: 'SR 0001',
    employee_name: 'ทดสอบ หนึ่ง',
    position: 'Common',
    data: { leave_type: 'ลาป่วย', ...data },
    created_at: '2026-10-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeLeaveType', () => {
  it('นับ "ลากิจพิเศษ" จากฟอร์มเป็น "ลาพิเศษ"', () => {
    expect(normalizeLeaveType('ลากิจพิเศษ')).toBe('ลาพิเศษ');
    expect(normalizeLeaveType('ลาพิเศษ')).toBe('ลาพิเศษ');
  });

  it('ไม่สนตัวพิมพ์เล็กใหญ่ของ Day Off', () => {
    expect(normalizeLeaveType('Day off')).toBe('Day Off');
    expect(normalizeLeaveType(' DAY OFF ')).toBe('Day Off');
  });

  it('ค่าว่างหรือค่าที่ไม่รู้จักเข้า "อื่นๆ"', () => {
    expect(normalizeLeaveType('')).toBe('อื่นๆ');
    expect(normalizeLeaveType(undefined)).toBe('อื่นๆ');
    expect(normalizeLeaveType('ลาบวช')).toBe('อื่นๆ');
  });
});

describe('buildLeaveDataset', () => {
  it('จับคู่ด้วยรหัสพนักงาน แม้เขียนช่องว่างต่างกัน และแสดงชื่ออังกฤษกับรหัสจากทะเบียน', () => {
    const { records } = buildLeaveDataset([row({ employee_id: 'sr0001', employee_name: 'ชื่ออื่น' })], [emp()]);
    expect(records).toHaveLength(1);
    expect(records[0].employeeCode).toBe('SR 0001');
    expect(records[0].englishName).toBe('Test One');
  });

  it('ถ้าไม่มีรหัส ให้จับคู่ด้วยชื่อไทยที่มีคำนำหน้า รวมถึง "นางสาว"', () => {
    const employees = [emp({ title_prefix: 'นางสาว', first_name: 'ทดสอบ', last_name: 'สอง', english_name: 'Test Two' })];
    const { records } = buildLeaveDataset([row({ employee_id: undefined, employee_name: 'นางสาวทดสอบ สอง' })], employees);
    expect(records.map(leaveRecordName)).toEqual(['Test Two']);
  });

  it('ตัดคนที่ตำแหน่งปัจจุบันไม่ใช่ Common Driver แม้ฟอร์มจะเลือก Common', () => {
    const data = buildLeaveDataset([row({ position: 'Common' })], [emp({ position: 'Temp Driver' })]);
    expect(data.records).toHaveLength(0);
    expect(data.excludedNotCommon).toBe(1);
    expect(data.excludedUnmatched).toBe(0);
  });

  it('นับคนที่ทะเบียนเป็น Common Driver แม้ฟอร์มจะเลือกตำแหน่งอื่น', () => {
    const { records } = buildLeaveDataset([row({ position: 'Position' })], [emp()]);
    expect(records).toHaveLength(1);
  });

  it('รหัสเป็นของคนตำแหน่งอื่น ไม่ไปจับคู่คน Common ที่ชื่อเหมือนกัน', () => {
    const employees = [
      emp(),
      emp({ id: 'e2', employee_code: 'SR 0002', position: 'Position Driver', english_name: 'Other Person' }),
    ];
    const data = buildLeaveDataset([row({ employee_id: 'SR 0002' })], employees);
    expect(data.records).toHaveLength(0);
    expect(data.excludedNotCommon).toBe(1);
  });

  it('ชื่อซ้ำกันและไม่มีรหัส ถือว่าจับคู่ไม่ได้ ไม่เดาคน', () => {
    const employees = [emp(), emp({ id: 'e2', employee_code: 'SR 0002' })];
    const data = buildLeaveDataset([row({ employee_id: undefined })], employees);
    expect(data.records).toHaveLength(0);
    expect(data.excludedUnmatched).toBe(1);
  });

  it('รหัสซ้ำกันในทะเบียน ใช้ชื่อช่วยแยกคน', () => {
    const employees = [emp(), emp({ id: 'e2', first_name: 'อีกคน', english_name: 'Another' })];
    const { records } = buildLeaveDataset([row({ employee_name: 'อีกคน หนึ่ง' })], employees);
    expect(records.map((r) => r.employeeId)).toEqual(['e2']);
  });

  it('รหัสและชื่อไม่อยู่ในทะเบียน นับเป็นจับคู่ไม่ได้', () => {
    const data = buildLeaveDataset([row({ employee_id: 'X', employee_name: 'ไม่มีในทะเบียน' })], [emp()]);
    expect(data.excludedUnmatched).toBe(1);
  });

  it('ยังนับคนที่พ้นสภาพแล้ว เพื่อไม่ให้ประเภทลาออกหาย', () => {
    const { records } = buildLeaveDataset([row({}, { leave_type: 'ลาออก' })], [emp({ status: 'inactive' })]);
    expect(records[0].leaveType).toBe('ลาออก');
    expect(records[0].employeeStatus).toBe('inactive');
  });

  it('ไม่มีชื่ออังกฤษ ให้แสดงชื่อไทยจากทะเบียนแทน', () => {
    const { records } = buildLeaveDataset([row()], [emp({ english_name: '  ', title_prefix: 'นาย' })]);
    expect(records[0].englishName).toBeUndefined();
    expect(leaveRecordName(records[0])).toBe('นาย ทดสอบ หนึ่ง');
  });

  it('เก็บเหตุผลเฉพาะประเภท "อื่นๆ"', () => {
    const { records } = buildLeaveDataset(
      [
        row({ id: 'r1' }, { leave_type: 'อื่นๆ', leave_reason: 'ไปต่างจังหวัด' }),
        row({ id: 'r2' }, { leave_type: 'ลาบวช' }),
        row({ id: 'r3' }, { leave_type: 'อื่นๆ' }),
        row({ id: 'r4' }, { leave_type: 'ลาป่วย', leave_reason: 'ค่าค้าง' }),
      ],
      [emp()],
    );
    expect(records.map((r) => r.reason)).toEqual(['ไปต่างจังหวัด', 'ลาบวช', undefined, undefined]);
  });
});

describe('สถิติ', () => {
  const employees = [emp(), emp({ id: 'e2', employee_code: 'SR 0002', first_name: 'ทดสอบ', last_name: 'สอง' })];
  const { records } = buildLeaveDataset(
    [
      row({ id: 'r1' }, { leave_type: 'ลาป่วย' }),
      row({ id: 'r2' }, { leave_type: 'ลาป่วย' }),
      row({ id: 'r3', employee_id: 'SR 0002', employee_name: 'ทดสอบ สอง' }, { leave_type: 'ลากิจพิเศษ' }),
    ],
    employees,
  );

  it('แสดงครบ 9 ประเภทตามลำดับคงที่ แม้ยอดเป็น 0', () => {
    const buckets = countByLeaveType(records);
    expect(buckets.map((b) => b.label)).toEqual([...LEAVE_TYPES]);
    expect(buckets.find((b) => b.label === 'ลาป่วย')?.count).toBe(2);
    expect(buckets.find((b) => b.label === 'ลาพิเศษ')?.count).toBe(1);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(records.length);
  });

  it('หาประเภทสูงสุดและจำนวนคน', () => {
    expect(topLeaveType(records)).toEqual({ label: 'ลาป่วย', count: 2 });
    expect(topLeaveType([])).toBeNull();
    expect(countDistinctEmployees(records)).toBe(2);
  });

  it('สรุปรายคน เรียงจากคนที่มีรายการมากสุด', () => {
    expect(groupLeaveByEmployee(records).map((g) => [g.employeeCode, g.records.length])).toEqual([
      ['SR 0001', 2],
      ['SR 0002', 1],
    ]);
  });

  it('หาจุดสูงสุดของกราฟ และไม่มีจุดสูงสุดเมื่อทุกจุดเป็น 0', () => {
    expect(findPeakIndex([{ count: 1 }, { count: 4 }, { count: 2 }])).toBe(1);
    expect(findPeakIndex([{ count: 0 }, { count: 0 }])).toBe(-1);
  });
});

describe('buildLeaveExcelSheets', () => {
  const { records } = buildLeaveDataset(
    [row({}, { leave_type: 'ลากิจพิเศษ', leave_phone: '0811111111', cover_phone: '0822222222', cover_person_name: 'คนแทน' })],
    [emp()],
  );
  const sheets = buildLeaveExcelSheets(records);

  it('มีชีตสรุปและแยกชีตครบทุกประเภท', () => {
    expect(sheets.map((s) => s.sheetName)).toEqual(['สรุป', ...LEAVE_TYPES]);
    expect(sheets[0].rows.at(-1)).toEqual({ ประเภทการลา: 'รวม', จำนวนรายการ: 1, จำนวนพนักงาน: 1 });
  });

  it('มีรหัสและชื่ออังกฤษ แต่ไม่มีเบอร์โทร', () => {
    const special = sheets.find((s) => s.sheetName === 'ลาพิเศษ');
    expect(special?.rows[0]).toMatchObject({
      รหัสพนักงาน: 'SR 0001',
      'Name (English)': 'Test One',
      ชื่อคนแทน: 'คนแทน',
    });
    expect(JSON.stringify(sheets)).not.toMatch(/081|082|080/);
  });
});
