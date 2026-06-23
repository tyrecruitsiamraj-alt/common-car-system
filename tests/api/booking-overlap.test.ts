import { describe, expect, it } from 'vitest';
import { needsBookingOverlapCheck } from '../../api/_lib/bookingOverlap.js';

const cur = {
  employee_id: 'emp-1',
  vehicle_id: 'veh-1',
  starts_at: '2026-06-05T01:00:00.000Z', // 08:00 +7
  ends_at: '2026-06-05T10:00:00.000Z', // 17:00 +7
};

describe('needsBookingOverlapCheck', () => {
  it('skips when saving same schedule (metadata-only edit)', () => {
    expect(
      needsBookingOverlapCheck(
        cur,
        { document_no: 'DOC-1', starts_at: cur.starts_at, ends_at: cur.ends_at },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        new Date(cur.ends_at),
      ),
    ).toBe(false);
  });

  it('skips when marking complete without extending effective window', () => {
    const completedAt = new Date('2026-06-05T05:00:00.000Z'); // 12:00 +7
    expect(
      needsBookingOverlapCheck(
        { ...cur, completed_at: null },
        { mark_completed: true, starts_at: cur.starts_at, ends_at: cur.ends_at },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        new Date(cur.ends_at),
        completedAt,
      ),
    ).toBe(false);
  });

  it('checks when scheduled ends_at is extended and effective window grows', () => {
    expect(
      needsBookingOverlapCheck(
        cur,
        { ends_at: '2026-06-05T11:00:00.000Z' },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        new Date('2026-06-05T11:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('checks when vehicle changes', () => {
    expect(
      needsBookingOverlapCheck(
        cur,
        { vehicle_id: 'veh-2' },
        'emp-1',
        'veh-2',
        new Date(cur.starts_at),
        new Date(cur.ends_at),
      ),
    ).toBe(true);
  });

  it('requires overlap check when completed_at extends from 12:00 to 16:00', () => {
    const base = {
      ...cur,
      completed_at: '2026-06-05T05:00:00.000Z', // 12:00 +7
    };
    const newCompletedAt = new Date('2026-06-05T09:00:00.000Z'); // 16:00 +7
    expect(
      needsBookingOverlapCheck(
        base,
        { completed_at: newCompletedAt.toISOString() },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        new Date(cur.ends_at),
        newCompletedAt,
      ),
    ).toBe(true);
  });

  it('skips overlap check when completed_at shrinks from 16:00 to 12:00', () => {
    const base = {
      ...cur,
      completed_at: '2026-06-05T09:00:00.000Z', // 16:00 +7
    };
    const newCompletedAt = new Date('2026-06-05T05:00:00.000Z'); // 12:00 +7
    expect(
      needsBookingOverlapCheck(
        base,
        { completed_at: newCompletedAt.toISOString() },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        new Date(cur.ends_at),
        newCompletedAt,
      ),
    ).toBe(false);
  });

  it('skips overlap check when completed_at is set before ends_at and shrinks the window', () => {
    const newCompletedAt = new Date('2026-06-05T05:00:00.000Z'); // 12:00 +7
    expect(
      needsBookingOverlapCheck(
        { ...cur, completed_at: null },
        { completed_at: newCompletedAt.toISOString() },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        new Date(cur.ends_at),
        newCompletedAt,
      ),
    ).toBe(false);
  });

  it('requires overlap check when completed_at is cleared and effective end expands to ends_at', () => {
    const base = {
      ...cur,
      completed_at: '2026-06-05T05:00:00.000Z', // 12:00 +7
    };
    expect(
      needsBookingOverlapCheck(
        base,
        { completed_at: null },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        new Date(cur.ends_at),
        null,
      ),
    ).toBe(true);
  });

  it('skips when ends_at extends but completed_at keeps effective window unchanged', () => {
    const base = {
      ...cur,
      completed_at: '2026-06-05T05:00:00.000Z', // 12:00 +7
    };
    const newEnds = new Date('2026-06-05T11:00:00.000Z'); // 18:00 +7
    const completedAt = new Date('2026-06-05T05:00:00.000Z');
    expect(
      needsBookingOverlapCheck(
        base,
        { ends_at: newEnds.toISOString() },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        newEnds,
        completedAt,
      ),
    ).toBe(false);
  });
});
