import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { buildExcelWorkbook, ymdToExcelSerial } from '@/lib/exportExcel';
import {
  EMPTY_LEAVE_FILTERS,
  LEAVE_TYPES,
  applyLeaveFilters,
  buildDailySeries,
  buildLeaveDataset,
  buildMonthlyLeaveTrend,
  computeLeaveOverviewData,
  countByLeaveType,
  countDistinctEmployees,
  dailyZoomRange,
  defaultDailyRange,
  findPeakIndex,
  groupLeaveByEmployee,
  hasActiveLeaveFilters,
  leaveRecordName,
  normalizeLeaveType,
  quickLeaveRange,
  topLeaveType,
  withoutDateFilter,
  type LeaveFilters,
} from '@/lib/leaveDashboard';
import { buildLeaveExcelSheets } from '@/lib/leaveExcelExport';
import type { IssueReportRow } from '@/lib/issueReportStats';
import type { DriverTmaProfile, Employee } from '@/types';

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

  it('นับคนขับทุกประเภทในหน้า Drivers', () => {
    const positions = ['Common Driver', 'Temp Driver', 'Support Driver', 'Position Driver', 'Driver Co', 'JP Co'];
    const employees = positions.map((position, i) =>
      emp({ id: `e${i}`, employee_code: `SR 100${i}`, first_name: `คน${i}`, position }),
    );
    const rows = positions.map((_, i) => row({ id: `r${i}`, employee_id: `SR 100${i}`, employee_name: `คน${i} หนึ่ง` }));
    const data = buildLeaveDataset(rows, employees);
    expect(data.records.map((r) => r.position)).toEqual(positions);
  });

  it('ตัดคนที่ตำแหน่งปัจจุบันไม่ใช่คนขับ แม้ฟอร์มจะเลือก Common', () => {
    const data = buildLeaveDataset([row({ position: 'Common' })], [emp({ position: 'Admin' })]);
    expect(data.records).toHaveLength(0);
    expect(data.excludedNotDriver).toBe(1);
    expect(data.excludedInactive).toBe(0);
    expect(data.excludedUnmatched).toBe(0);
  });

  it('นับคนที่ทะเบียนเป็น Common Driver แม้ฟอร์มจะเลือกตำแหน่งอื่น', () => {
    const { records } = buildLeaveDataset([row({ position: 'Position' })], [emp()]);
    expect(records).toHaveLength(1);
  });

  it('รหัสเป็นของคนตำแหน่งอื่น ไม่ไปจับคู่คนขับที่ชื่อเหมือนกัน', () => {
    const employees = [
      emp(),
      emp({ id: 'e2', employee_code: 'SR 0002', position: 'Admin', english_name: 'Other Person' }),
    ];
    const data = buildLeaveDataset([row({ employee_id: 'SR 0002' })], employees);
    expect(data.records).toHaveLength(0);
    expect(data.excludedNotDriver).toBe(1);
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

  it('ไม่นับคนที่ลาออก/พ้นสภาพแล้ว รวมถึงรายการประเภทลาออก', () => {
    const data = buildLeaveDataset(
      [row({ id: 'r1' }), row({ id: 'r2' }, { leave_type: 'ลาออก' })],
      [emp({ status: 'inactive' })],
    );
    expect(data.records).toHaveLength(0);
    expect(data.excludedInactive).toBe(2);
    expect(data.excludedNotDriver).toBe(0);
  });

  it('ยังนับคนที่พักงาน', () => {
    const { records } = buildLeaveDataset([row()], [emp({ status: 'suspended' })]);
    expect(records[0].employeeStatus).toBe('suspended');
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

describe('ตัวกรอง', () => {
  const employees = [emp(), emp({ id: 'e2', employee_code: 'SR 0002', last_name: 'สอง', status: 'suspended' })];
  const { records } = buildLeaveDataset(
    [
      row({ id: 'r1', report_date: '2026-10-01' }, { leave_type: 'ลาป่วย', supervisor_name: 'นายเอ' }),
      row({ id: 'r2', report_date: '2026-10-15' }, { leave_type: 'ลากิจ', supervisor_name: 'นายบี' }),
      row({ id: 'r3', report_date: '2026-11-01', employee_id: 'SR 0002', employee_name: 'ทดสอบ สอง' }, { leave_type: 'ลาออก' }),
      row({ id: 'r4', report_date: undefined }, { leave_type: 'ลาป่วย' }),
    ],
    employees,
  );
  const ids = (f: Partial<LeaveFilters>) =>
    applyLeaveFilters(records, { ...EMPTY_LEAVE_FILTERS, ...f }).map((r) => r.id);

  it('ไม่มีตัวกรองได้ครบทุกรายการ', () => {
    expect(ids({})).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(hasActiveLeaveFilters(EMPTY_LEAVE_FILTERS)).toBe(false);
  });

  it('กรองช่วงวันที่แบบรวมวันต้นและวันท้าย และตัดรายการที่ไม่มีวันที่', () => {
    expect(ids({ from: '2026-10-01', to: '2026-10-15' })).toEqual(['r1', 'r2']);
    expect(ids({ from: '2026-10-02' })).toEqual(['r2', 'r3']);
  });

  it('กรองประเภท พนักงาน สถานะ และชื่อนาย', () => {
    expect(ids({ types: ['ลาป่วย', 'ลาออก'] })).toEqual(['r1', 'r3', 'r4']);
    expect(ids({ employeeId: 'e2' })).toEqual(['r3']);
    expect(ids({ status: 'suspended' })).toEqual(['r3']);
    expect(ids({ supervisor: 'นายบี' })).toEqual(['r2']);
  });

  it('รวมหลายตัวกรองพร้อมกัน และเอาเฉพาะช่วงวันที่ออกได้', () => {
    const filters: LeaveFilters = { ...EMPTY_LEAVE_FILTERS, from: '2026-11-01', types: ['ลาป่วย'] };
    expect(hasActiveLeaveFilters(filters)).toBe(true);
    expect(applyLeaveFilters(records, filters)).toHaveLength(0);
    expect(applyLeaveFilters(records, withoutDateFilter(filters)).map((r) => r.id)).toEqual(['r1', 'r4']);
  });

  it('ช่วงวันที่ลัดคำนวณตามเวลาท้องถิ่น', () => {
    const now = new Date(2026, 2, 15, 23, 30);
    expect(quickLeaveRange('today', now)).toEqual({ from: '2026-03-15', to: '2026-03-15' });
    expect(quickLeaveRange('last7', now)).toEqual({ from: '2026-03-09', to: '2026-03-15' });
    expect(quickLeaveRange('thisMonth', now)).toEqual({ from: '2026-03-01', to: '2026-03-31' });
    expect(quickLeaveRange('lastMonth', now)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(quickLeaveRange('all', now)).toEqual({});
  });
});

describe('กราฟรายวัน', () => {
  const { records } = buildLeaveDataset(
    [row({ id: 'r1', report_date: '2026-03-01' }), row({ id: 'r2', report_date: '2026-03-01' }), row({ id: 'r3', report_date: '2026-03-03' })],
    [emp()],
  );

  it('มีครบทุกวันในช่วง รวมวันที่ไม่มีรายการ และข้ามเดือนได้', () => {
    const points = buildDailySeries(records, '2026-02-28', '2026-03-03');
    expect(points.map((p) => [p.ymd, p.count])).toEqual([
      ['2026-02-28', 0],
      ['2026-03-01', 2],
      ['2026-03-02', 0],
      ['2026-03-03', 1],
    ]);
  });

  it('แยกยอดรายวันตามประเภท และยอดรวมเท่ากับผลรวมทุกประเภท', () => {
    const { records: mixed } = buildLeaveDataset(
      [
        row({ id: 'r1', report_date: '2026-03-01' }, { leave_type: 'ลาป่วย' }),
        row({ id: 'r2', report_date: '2026-03-01' }, { leave_type: 'Day Off' }),
        row({ id: 'r3', report_date: '2026-03-01' }, { leave_type: 'ลาป่วย' }),
      ],
      [emp()],
    );
    const [day] = buildDailySeries(mixed, '2026-03-01', '2026-03-01');
    expect(day.byType).toMatchObject({ ลาป่วย: 2, 'Day Off': 1, พักร้อน: 0 });
    expect(Object.keys(day.byType)).toEqual([...LEAVE_TYPES]);
    expect(day.count).toBe(3);
  });

  it('ช่วงกลับด้านได้ผลว่าง', () => {
    expect(buildDailySeries(records, '2026-03-03', '2026-03-01')).toEqual([]);
  });

  it('ซูมเป็น -2 ถึง +2 วัน และข้ามเดือนได้', () => {
    expect(dailyZoomRange('2026-03-01')).toEqual({ from: '2026-02-27', to: '2026-03-03' });
    expect(buildDailySeries(records, dailyZoomRange('2026-03-01').from, dailyZoomRange('2026-03-01').to)).toHaveLength(5);
  });

  it('ค่าเริ่มต้นคือ 30 วันล่าสุด', () => {
    const range = defaultDailyRange(new Date(2026, 10, 5));
    expect(range).toEqual({ from: '2026-10-07', to: '2026-11-05' });
    expect(buildDailySeries([], range.from, range.to)).toHaveLength(30);
  });
});

describe('กราฟรายเดือน', () => {
  const { records } = buildLeaveDataset(
    [
      row({ id: 'r1', report_date: '2026-11-03' }, { leave_type: 'พักร้อน' }),
      row({ id: 'r2', report_date: '2026-11-20' }, { leave_type: 'ลาออก' }),
      row({ id: 'r3', report_date: '2026-06-30' }, { leave_type: 'ลาป่วย' }),
      row({ id: 'r4', report_date: '2026-05-31' }, { leave_type: 'ลาป่วย' }),
      row({ id: 'r5', report_date: undefined }, { leave_type: 'ลาป่วย' }),
    ],
    [emp()],
  );
  const months = buildMonthlyLeaveTrend(records, new Date(2026, 10, 6));

  it('มี 6 เดือนล่าสุดรวมเดือนปัจจุบัน และตัดรายการที่เก่ากว่าหรือไม่มีวันที่', () => {
    expect(months.map((m) => m.count)).toEqual([1, 0, 0, 0, 0, 2]);
    expect(months[0].label).toBe(format(new Date(2026, 5, 1), 'MMM yy', { locale: th }));
  });

  it('แยกยอดรายเดือนตามประเภท', () => {
    expect(months[5].byType).toMatchObject({ พักร้อน: 1, ลาออก: 1, ลาป่วย: 0 });
    expect(months[0].byType.ลาป่วย).toBe(1);
  });
});

describe('ข้อมูลจาก Database TMA และคนแทน', () => {
  const profile = (o: Partial<DriverTmaProfile> = {}): DriverTmaProfile =>
    ({ id: 'p1', employee_id: 'e1', line_id: 'demo.line', driver_picture_url: 'https://example.test/p.jpg', ...o }) as DriverTmaProfile;

  it('เติม Line และรูปคนขับจากโปรไฟล์ของคนนั้น', () => {
    const { records } = buildLeaveDataset([row()], [emp()], [profile()]);
    expect(records[0].lineId).toBe('demo.line');
    expect(records[0].driverPictureUrl).toBe('https://example.test/p.jpg');
  });

  it('ใช้ชื่ออังกฤษจากทะเบียนก่อน ถ้าไม่มีจึงใช้จาก TMA', () => {
    const fromTma = buildLeaveDataset([row()], [emp({ english_name: undefined })], [profile({ driver_name_eng: 'Tma Name' })]);
    expect(fromTma.records[0].englishName).toBe('Tma Name');
    const fromRegistry = buildLeaveDataset([row()], [emp()], [profile({ driver_name_eng: 'Tma Name' })]);
    expect(fromRegistry.records[0].englishName).toBe('Test One');
  });

  it('จับคู่คนแทนด้วยชื่อที่ตรงคนเดียว ถ้าไม่เจอเก็บชื่อตามที่กรอก', () => {
    const employees = [emp(), emp({ id: 'e2', employee_code: 'SR 0002', last_name: 'สอง', english_name: 'Test Two', position: 'Temp Driver' })];
    const matched = buildLeaveDataset([row({}, { cover_person_name: 'นาย ทดสอบ สอง', cover_phone: '0812345678' })], employees);
    expect(matched.records[0]).toMatchObject({ substituteCode: 'SR 0002', substituteEnglishName: 'Test Two', substitutePhone: '0812345678' });
    const unmatched = buildLeaveDataset([row({}, { cover_person_name: 'คนนอกทะเบียน' })], employees);
    expect(unmatched.records[0].substituteCode).toBeUndefined();
    expect(unmatched.records[0].coverPersonName).toBe('คนนอกทะเบียน');
  });
});

describe('computeLeaveOverviewData', () => {
  it('ตัดเคสที่จับคู่ทะเบียนไม่ได้/ไม่ใช่คนขับ Common/พ้นสภาพออก เหมือน Dashboard การลา', () => {
    const employees = [
      emp(),
      emp({ id: 'e2', employee_code: 'SR 0002', first_name: 'แอดมิน', position: 'Admin' }),
      emp({ id: 'e3', employee_code: 'SR 0003', first_name: 'พ้นสภาพ', status: 'inactive' }),
    ];
    const rows = [
      row({ id: 'r1' }), // จับคู่ได้ เป็น Common ที่ยังทำงานอยู่ → นับ
      row({ id: 'r2', employee_id: 'SR 0002', employee_name: 'แอดมิน' }), // ไม่ใช่คนขับ → ไม่นับ
      row({ id: 'r3', employee_id: 'SR 0003', employee_name: 'พ้นสภาพ' }), // พ้นสภาพแล้ว → ไม่นับ
      row({ id: 'r4', employee_id: 'X', employee_name: 'ไม่มีในทะเบียน' }), // จับคู่ไม่ได้ → ไม่นับ
    ];
    const result = computeLeaveOverviewData(rows, employees, '2026-10-01', '2026-10-31');
    expect(result.totalPeople).toBe(1);
    expect(result.caseRows.map((r) => r.id)).toEqual(['r1']);
    expect(result.byLeaveType).toEqual([{ label: 'ลาป่วย', count: 1 }]);
    expect(result.people).toEqual([{ name: 'Test One', position: 'Common Driver', count: 1, cases: ['ลาป่วย'] }]);
  });

  it('กรองตามช่วงวันที่ที่กำหนด', () => {
    const rows = [row({ id: 'r1', report_date: '2026-09-30' }), row({ id: 'r2', report_date: '2026-10-15' })];
    const result = computeLeaveOverviewData(rows, [emp()], '2026-10-01', '2026-10-31');
    expect(result.caseRows.map((r) => r.id)).toEqual(['r2']);
  });

  it('ไม่กำหนดช่วงวันที่ นับทุกรายการ รวมรายการที่ไม่มีวันที่ เหมือน Dashboard ตอนเลือก "ทุกวันที่"', () => {
    const rows = [
      row({ id: 'r1', report_date: '2025-01-05' }),
      row({ id: 'r2', report_date: '2026-10-15' }),
      row({ id: 'r3', report_date: undefined }),
    ];
    const result = computeLeaveOverviewData(rows, [emp()], undefined, undefined);
    expect(result.caseRows.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('ประเภท "อื่นๆ" ใช้เหตุผลที่กรอกเป็นชื่อเคส เหมือน summarizeIssueReportRow', () => {
    const rows = [row({ id: 'r1' }, { leave_type: 'อื่นๆ', leave_reason: 'ไปต่างจังหวัด' })];
    const result = computeLeaveOverviewData(rows, [emp()], '2026-10-01', '2026-10-31');
    expect(result.people[0].cases).toEqual(['ไปต่างจังหวัด']);
  });
});

describe('buildLeaveExcelSheets', () => {
  const employees = [
    emp(),
    emp({ id: 'e2', employee_code: 'SR 0000', last_name: 'สอง', english_name: undefined, title_prefix: 'นาย', position: 'Position Driver' }),
  ];
  const { records } = buildLeaveDataset(
    [
      row({ id: 'r1', report_date: '2026-01-02' }, { leave_type: 'Day Off', leave_phone: '0811111111', cover_phone: '0822222222', cover_person_name: 'คนแทน' }),
      row({ id: 'r2', report_date: '2026-01-01' }, { leave_type: 'อื่นๆ', leave_reason: 'ธุระครอบครัว' }),
      row({ id: 'r3', report_date: '2026-01-05', employee_id: 'SR 0000', employee_name: 'ทดสอบ สอง' }, { leave_type: 'ลาป่วย' }),
    ],
    employees,
    [{ id: 'p1', employee_id: 'e1', line_id: 'demo.line' } as DriverTmaProfile],
  );
  const [sheet] = buildLeaveExcelSheets(records);

  it('เป็นชีตเดียว คอลัมน์ตรงตามแบบ', () => {
    expect(buildLeaveExcelSheets(records)).toHaveLength(1);
    expect(Object.keys(sheet.rows[0])).toEqual([
      'ID', 'Driver Name Eng', 'Date', 'Leave Type', 'Leave Detail', 'User Name',
      'Substitute_ID', 'Substitute_Name', 'Substitute_Tel', 'Line', 'Driver Pic',
    ]);
  });

  it('เรียงตามรหัส แล้วเรียงวันที่จากเก่าไปใหม่', () => {
    expect(sheet.rows.map((r) => [r.ID, r.Date])).toEqual([
      ['SR 0000', ymdToExcelSerial('2026-01-05')],
      ['SR 0001', ymdToExcelSerial('2026-01-01')],
      ['SR 0001', ymdToExcelSerial('2026-01-02')],
    ]);
  });

  it('แปลงค่าตามแบบ: ประเภทอังกฤษ รายละเอียดภาษาไทย ตำแหน่งจากทะเบียน และเบอร์คนแทน', () => {
    expect(sheet.rows[2]).toMatchObject({
      'Driver Name Eng': 'Test One',
      'Leave Type': 'Day Off',
      'Leave Detail': 'Day Off',
      'User Name': 'Common',
      Substitute_Name: 'คนแทน',
      Substitute_Tel: '0822222222',
      Line: 'demo.line',
    });
    expect(sheet.rows[1]).toMatchObject({ 'Leave Type': 'Other', 'Leave Detail': 'ธุระครอบครัว' });
    expect(sheet.rows[0]).toMatchObject({
      'Driver Name Eng': 'นาย ทดสอบ สอง',
      'Leave Type': 'Sick Leave',
      'Leave Detail': 'ลาป่วย',
      'User Name': 'Position',
    });
  });

  it('ไม่มีเบอร์ของคนลา', () => {
    expect(JSON.stringify(sheet.rows)).not.toContain('0811111111');
  });

  it('ไฟล์จริงแสดงวันที่แบบ 1-Jan-26 เก็บเป็นวันที่จริง และมีปุ่มกรอง', () => {
    const wb = buildExcelWorkbook([sheet]);
    const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const ws = XLSX.read(bytes, { type: 'array', cellNF: true, cellText: true }).Sheets.Leave;
    expect(ws.C3.t).toBe('n');
    expect(ws.C3.w).toBe('1-Jan-26');
    expect(ws['!autofilter']?.ref).toBe('A1:K4');
  });
});
