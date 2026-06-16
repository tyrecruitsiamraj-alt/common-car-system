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

  it('skips when marking complete without extending schedule', () => {
    expect(
      needsBookingOverlapCheck(
        cur,
        { mark_completed: true, starts_at: cur.starts_at, ends_at: cur.ends_at },
        'emp-1',
        'veh-1',
        new Date(cur.starts_at),
        new Date('2026-06-05T06:00:00.000Z'), // 13:00 +7 — shorter
      ),
    ).toBe(false);
  });

  it('checks when end time is extended', () => {
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
});
