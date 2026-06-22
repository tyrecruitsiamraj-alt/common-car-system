import { describe, expect, it } from 'vitest';
import {
  BOOKING_CONFLICT_MESSAGES,
  conflictDetailFromRow,
  createBookingRequestId,
  userSeesConflictDetail,
} from '../../api/_lib/bookingConflict.js';

describe('bookingConflict', () => {
  it('creates a request id', () => {
    const id = createBookingRequestId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('exposes conflict messages', () => {
    expect(BOOKING_CONFLICT_MESSAGES.vehicle).toBe('รถคันนี้ถูกจองในช่วงเวลานี้แล้ว');
    expect(BOOKING_CONFLICT_MESSAGES.employee).toBe('พนักงานคนนี้มีการจองทับช่วงเวลานี้แล้ว');
    expect(BOOKING_CONFLICT_MESSAGES.staleCancelled).toBe(
      'รายการเดิมถูกยกเลิกแล้ว กรุณารีเฟรชข้อมูล',
    );
  });

  it('shows conflict detail only to admin', () => {
    expect(userSeesConflictDetail('admin')).toBe(true);
    expect(userSeesConflictDetail('supervisor')).toBe(false);
    expect(userSeesConflictDetail('staff')).toBe(false);
  });

  it('maps conflict rows to detail payload', () => {
    expect(
      conflictDetailFromRow({
        id: 'b1',
        work_order_no: 'BK-000001',
        employee_id: 'e1',
        vehicle_id: 'v1',
        starts_at: '2026-05-05T01:00:00.000Z',
        ends_at: '2026-05-05T10:00:00.000Z',
        completed_at: '2026-05-05T06:00:00.000Z',
        status: 'active',
        effective_end: '2026-05-05T06:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'b1',
      vehicle_id: 'v1',
      employee_id: 'e1',
      effective_end: '2026-05-05T06:00:00.000Z',
      status: 'active',
      work_order_no: 'BK-000001',
    });
  });
});
