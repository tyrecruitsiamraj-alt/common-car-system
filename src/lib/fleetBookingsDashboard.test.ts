import { describe, expect, it } from 'vitest';
import { bookingsOnDay, bookingEffectiveEnd, computeTodaySummaryCounts } from '@/lib/fleetBookingsDashboard';
import type { VehicleBooking } from '@/types';

function booking(partial: Partial<VehicleBooking> & Pick<VehicleBooking, 'starts_at' | 'ends_at'>): VehicleBooking {
  return {
    id: partial.id ?? 'b1',
    employee_id: partial.employee_id ?? 'e1',
    vehicle_id: partial.vehicle_id ?? 'v1',
    status: partial.status ?? 'active',
    created_at: partial.created_at ?? '2026-05-05T00:00:00.000Z',
    updated_at: partial.updated_at ?? '2026-05-05T00:00:00.000Z',
    ...partial,
  };
}

describe('bookingsOnDay', () => {
  it('attributes completed booking to work day, not close day', () => {
    const b = booking({
      starts_at: '2026-05-05T08:00:00+07:00',
      ends_at: '2026-05-05T17:00:00+07:00',
      completed_at: '2026-05-06T09:00:00+07:00',
    });
    const workDay = new Date(2026, 4, 5);
    const closeDay = new Date(2026, 4, 6);

    expect(bookingsOnDay([b], workDay)).toHaveLength(1);
    expect(bookingsOnDay([b], closeDay)).toHaveLength(0);
  });

  it('counts completed on work day summary', () => {
    const b = booking({
      starts_at: '2026-05-05T08:00:00+07:00',
      ends_at: '2026-05-05T17:00:00+07:00',
      completed_at: '2026-05-06T09:00:00+07:00',
    });
    const workDay = new Date(2026, 4, 5);
    const closeDay = new Date(2026, 4, 6);

    expect(computeTodaySummaryCounts([b], workDay)).toMatchObject({ completed: 1 });
    expect(computeTodaySummaryCounts([b], closeDay)).toMatchObject({ completed: 0 });
  });

  it('occupancy uses scheduled ends_at even when completed late', () => {
    const b = booking({
      starts_at: '2026-05-05T08:00:00+07:00',
      ends_at: '2026-05-05T17:00:00+07:00',
      completed_at: '2026-05-06T09:00:00+07:00',
    });
    expect(bookingEffectiveEnd(b).toISOString()).toBe(new Date(b.ends_at).toISOString());
  });
});
