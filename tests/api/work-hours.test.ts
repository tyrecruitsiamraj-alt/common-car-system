import { describe, expect, it } from 'vitest';
import { avgHoursPerDay, periodBounds, splitWorkHours } from '../../api/_lib/workHours.js';

describe('splitWorkHours', () => {
  it('counts a shift entirely inside 08:00-17:00 as all normal hours', () => {
    const starts = new Date('2026-10-15T08:00:00');
    const completed = new Date('2026-10-15T16:00:00');
    const { totalHours, normalHours, otHours } = splitWorkHours(starts, completed);
    expect(totalHours).toBe(8);
    expect(normalHours).toBe(8);
    expect(otHours).toBe(0);
  });

  it('counts time before 08:00 and after 17:00 as OT', () => {
    const starts = new Date('2026-10-15T06:00:00');
    const completed = new Date('2026-10-15T19:00:00');
    const { totalHours, normalHours, otHours } = splitWorkHours(starts, completed);
    expect(totalHours).toBe(13);
    expect(normalHours).toBe(9);
    expect(otHours).toBe(4);
  });

  it('counts a shift entirely after 17:00 as all OT', () => {
    const starts = new Date('2026-10-15T18:00:00');
    const completed = new Date('2026-10-15T20:00:00');
    const { normalHours, otHours } = splitWorkHours(starts, completed);
    expect(normalHours).toBe(0);
    expect(otHours).toBe(2);
  });

  it('never returns negative hours when completed before starts', () => {
    const starts = new Date('2026-10-15T10:00:00');
    const completed = new Date('2026-10-15T09:00:00');
    const { totalHours, normalHours, otHours } = splitWorkHours(starts, completed);
    expect(totalHours).toBe(0);
    expect(normalHours).toBe(0);
    expect(otHours).toBe(0);
  });
});

describe('avgHoursPerDay', () => {
  it('divides total hours by days worked', () => {
    expect(avgHoursPerDay(80, 10)).toBe(8);
  });

  it('returns 0 when no days worked, instead of dividing by zero', () => {
    expect(avgHoursPerDay(0, 0)).toBe(0);
  });
});

describe('periodBounds', () => {
  it('returns the same day for "day"', () => {
    expect(periodBounds('day', new Date('2026-10-15'))).toEqual({ from: '2026-10-15', to: '2026-10-15' });
  });

  it('returns Monday-Sunday for "week"', () => {
    // 2026-10-15 is a Thursday
    expect(periodBounds('week', new Date('2026-10-15'))).toEqual({ from: '2026-10-12', to: '2026-10-18' });
  });

  it('returns the full calendar month for "month"', () => {
    expect(periodBounds('month', new Date('2026-10-15'))).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('returns the full calendar year for "year"', () => {
    expect(periodBounds('year', new Date('2026-10-15'))).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});
