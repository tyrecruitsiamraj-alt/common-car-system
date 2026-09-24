import { describe, expect, it } from 'vitest';
import {
  buildExamDailyChartData,
  buildExamDailyTableRows,
  buildExamTypeTotals,
  listExamKeysInOrder,
  type ExamDailyCountRow,
} from '@/lib/examDailyStats';

const ROWS: ExamDailyCountRow[] = [
  { day: '2026-09-22', exam_key: 'daily_driver_check', exam_title: 'Daily Driver Check Sheet', submission_count: 28, people_count: 28 },
  { day: '2026-09-22', exam_key: 'fuel_refill', exam_title: 'บันทึกการเติมน้ำมัน', submission_count: 10, people_count: 10 },
  { day: '2026-09-23', exam_key: 'fuel_refill', exam_title: 'บันทึกการเติมน้ำมัน', submission_count: 10, people_count: 9 },
  { day: '2026-09-23', exam_key: 'start_work_sticker_single', exam_title: 'บันทึกการตรวจสภาพรถ', submission_count: 21, people_count: 21 },
];

const KNOWN_ORDER = ['daily_driver_check', 'start_work_sticker_single', 'fuel_refill'];

describe('listExamKeysInOrder', () => {
  it('keeps the fixed known order and drops keys absent from the data', () => {
    const onlyTwo = ROWS.filter((r) => r.exam_key !== 'start_work_sticker_single');
    expect(listExamKeysInOrder(onlyTwo, KNOWN_ORDER)).toEqual(['daily_driver_check', 'fuel_refill']);
  });

  it('appends unknown keys sorted after the known ones', () => {
    const withUnknown: ExamDailyCountRow[] = [
      ...ROWS,
      { day: '2026-09-23', exam_key: 'zzz_new_exam', exam_title: 'ใหม่', submission_count: 1, people_count: 1 },
    ];
    expect(listExamKeysInOrder(withUnknown, KNOWN_ORDER)).toEqual([
      'daily_driver_check',
      'start_work_sticker_single',
      'fuel_refill',
      'zzz_new_exam',
    ]);
  });
});

describe('buildExamDailyChartData', () => {
  it('produces one point per day with a 0-filled key per exam type, sorted oldest first', () => {
    const points = buildExamDailyChartData(ROWS, KNOWN_ORDER);
    expect(points.map((p) => p.day)).toEqual(['2026-09-22', '2026-09-23']);
    expect(points[0]).toMatchObject({
      day: '2026-09-22',
      label: '22/09',
      daily_driver_check: 28,
      fuel_refill: 10,
      start_work_sticker_single: 0,
    });
    expect(points[1]).toMatchObject({
      day: '2026-09-23',
      daily_driver_check: 0,
      fuel_refill: 9,
      start_work_sticker_single: 21,
    });
  });
});

describe('buildExamDailyTableRows', () => {
  it('groups by day (newest first) with per-exam people/submissions and day totals', () => {
    const table = buildExamDailyTableRows(ROWS);
    expect(table.map((r) => r.day)).toEqual(['2026-09-23', '2026-09-22']);

    const day23 = table[0];
    expect(day23.perExam.fuel_refill).toEqual({ people: 9, submissions: 10 });
    expect(day23.perExam.start_work_sticker_single).toEqual({ people: 21, submissions: 21 });
    expect(day23.totalPeople).toBe(30);
    expect(day23.totalSubmissions).toBe(31);

    const day22 = table[1];
    expect(day22.totalPeople).toBe(38);
    expect(day22.totalSubmissions).toBe(38);
  });
});

describe('buildExamTypeTotals', () => {
  it('sums submissions, counts days with data, and averages people per day with data only', () => {
    const totals = buildExamTypeTotals(ROWS, KNOWN_ORDER);
    const fuel = totals.find((t) => t.exam_key === 'fuel_refill')!;
    expect(fuel.totalSubmissions).toBe(20);
    expect(fuel.daysWithData).toBe(2);
    expect(fuel.avgPeoplePerDay).toBe(9.5); // (10 + 9) / 2

    const daily = totals.find((t) => t.exam_key === 'daily_driver_check')!;
    expect(daily.daysWithData).toBe(1);
    expect(daily.avgPeoplePerDay).toBe(28);

    const sticker = totals.find((t) => t.exam_key === 'start_work_sticker_single')!;
    expect(sticker.daysWithData).toBe(1);
    expect(sticker.totalSubmissions).toBe(21);
  });

  it('returns zeroed entries for exam keys with no rows at all', () => {
    const totals = buildExamTypeTotals([], KNOWN_ORDER);
    expect(totals).toHaveLength(3);
    expect(totals.every((t) => t.totalSubmissions === 0 && t.daysWithData === 0 && t.avgPeoplePerDay === 0)).toBe(
      true,
    );
  });
});
