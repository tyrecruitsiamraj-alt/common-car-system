import { parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { bookingEffectiveEnd } from '@/lib/fleetBookingsDashboard';
import {
  BOOKABLE_DRIVER_POSITION,
  bookingBlocksWindow,
  computeBookingAvailability,
  hasEmployeeBookingConflict,
  hasVehicleBookingConflict,
  resolveBookEmployeeOptions,
  resolveBookVehicleOptions,
  type AvailabilityPayload,
} from '@/lib/bookingAvailability';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

const DAY = '2026-05-05';
const t = (hm: string) => `${DAY}T${hm}:00+07:00`;

const VEHICLE_A: Vehicle = {
  id: 'veh-a',
  plate_no: 'กก-1234',
  label: 'Toyota',
  seats: 5,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const VEHICLE_B: Vehicle = {
  id: 'veh-b',
  plate_no: 'ขข-5678',
  seats: 7,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const EMPLOYEE_1: Employee = {
  id: 'emp-1',
  employee_code: 'E001',
  first_name: 'สมชาย',
  last_name: 'ใจดี',
  phone: '0800000001',
  status: 'active',
  position: BOOKABLE_DRIVER_POSITION,
  join_date: '2024-01-01',
  reliability_score: 100,
  utilization_rate: 0,
  total_days_worked: 0,
  total_income: 0,
  total_cost: 0,
  total_issues: 0,
  created_at: '2026-01-01T00:00:00.000Z',
};

const EMPLOYEE_2: Employee = {
  ...EMPLOYEE_1,
  id: 'emp-2',
  employee_code: 'E002',
  first_name: 'สมหญิง',
  last_name: 'รักงาน',
  phone: '0800000002',
};

function booking(
  partial: Partial<VehicleBooking> & Pick<VehicleBooking, 'starts_at' | 'ends_at'>,
): VehicleBooking {
  return {
    id: partial.id ?? 'b1',
    employee_id: partial.employee_id ?? EMPLOYEE_1.id,
    vehicle_id: partial.vehicle_id ?? VEHICLE_A.id,
    status: partial.status ?? 'active',
    created_at: partial.created_at ?? '2026-05-05T00:00:00.000Z',
    updated_at: partial.updated_at ?? '2026-05-05T00:00:00.000Z',
    ...partial,
  };
}

function window(hmStart: string, hmEnd: string) {
  return { from: parseISO(t(hmStart)), to: parseISO(t(hmEnd)) };
}

describe('booking lifecycle — vehicle conflicts', () => {
  it('allows rebooking same slot after cancel', () => {
    const bookings = [
      booking({
        id: 'b-cancelled',
        status: 'cancelled',
        starts_at: t('08:00'),
        ends_at: t('17:00'),
      }),
    ];
    const { from, to } = window('08:00', '17:00');
    expect(hasVehicleBookingConflict(bookings, VEHICLE_A.id, from, to)).toBe(false);
  });

  it('allows new booking after early complete frees afternoon', () => {
    const bookings = [
      booking({
        starts_at: t('08:00'),
        ends_at: t('17:00'),
        completed_at: t('12:00'),
      }),
    ];
    const { from, to } = window('13:00', '17:00');
    expect(hasVehicleBookingConflict(bookings, VEHICLE_A.id, from, to)).toBe(false);
  });

  it('rejects overlap with effective_end at completed_at', () => {
    const bookings = [
      booking({
        starts_at: t('08:00'),
        ends_at: t('17:00'),
        completed_at: t('12:00'),
      }),
    ];
    const { from, to } = window('11:00', '13:00');
    expect(hasVehicleBookingConflict(bookings, VEHICLE_A.id, from, to)).toBe(true);
  });

  it('rejects overlapping active booking', () => {
    const bookings = [
      booking({
        starts_at: t('08:00'),
        ends_at: t('17:00'),
      }),
    ];
    const { from, to } = window('09:00', '10:00');
    expect(hasVehicleBookingConflict(bookings, VEHICLE_A.id, from, to)).toBe(true);
  });
});

describe('booking lifecycle — employee conflicts', () => {
  it('follows the same effective_end rules as vehicle overlap', () => {
    const bookings = [
      booking({
        employee_id: EMPLOYEE_1.id,
        starts_at: t('08:00'),
        ends_at: t('17:00'),
        completed_at: t('12:00'),
      }),
    ];
    const afternoon = window('13:00', '17:00');
    const overlap = window('11:00', '13:00');
    expect(hasEmployeeBookingConflict(bookings, EMPLOYEE_1.id, afternoon.from, afternoon.to)).toBe(
      false,
    );
    expect(hasEmployeeBookingConflict(bookings, EMPLOYEE_1.id, overlap.from, overlap.to)).toBe(true);
  });

  it('ignores cancelled bookings for driver overlap', () => {
    const bookings = [
      booking({
        employee_id: EMPLOYEE_1.id,
        status: 'cancelled',
        starts_at: t('08:00'),
        ends_at: t('17:00'),
      }),
    ];
    const { from, to } = window('08:00', '17:00');
    expect(hasEmployeeBookingConflict(bookings, EMPLOYEE_1.id, from, to)).toBe(false);
  });
});

describe('booking availability', () => {
  it('marks vehicle available when only cancelled booking occupies the window', () => {
    const bookings = [
      booking({
        status: 'cancelled',
        vehicle_id: VEHICLE_A.id,
        starts_at: t('08:00'),
        ends_at: t('17:00'),
      }),
    ];
    const { from, to } = window('08:00', '17:00');
    const avail = computeBookingAvailability(from, to, bookings, [EMPLOYEE_1], [VEHICLE_A, VEHICLE_B]);
    expect(avail.availableVehicles.map((v) => v.id)).toContain(VEHICLE_A.id);
  });

  it('excludes vehicle blocked by active booking', () => {
    const bookings = [
      booking({
        vehicle_id: VEHICLE_A.id,
        starts_at: t('08:00'),
        ends_at: t('17:00'),
      }),
    ];
    const { from, to } = window('08:00', '17:00');
    const avail = computeBookingAvailability(from, to, bookings, [EMPLOYEE_1, EMPLOYEE_2], [VEHICLE_A, VEHICLE_B]);
    expect(avail.availableVehicles.map((v) => v.id)).not.toContain(VEHICLE_A.id);
    expect(avail.availableVehicles.map((v) => v.id)).toContain(VEHICLE_B.id);
  });

  it('releases vehicle after completed_at within availability window', () => {
    const bookings = [
      booking({
        vehicle_id: VEHICLE_A.id,
        starts_at: t('08:00'),
        ends_at: t('17:00'),
        completed_at: t('12:00'),
      }),
    ];
    const { from, to } = window('13:00', '17:00');
    const avail = computeBookingAvailability(from, to, bookings, [EMPLOYEE_1], [VEHICLE_A]);
    expect(avail.availableVehicles.map((v) => v.id)).toContain(VEHICLE_A.id);
  });
});

describe('booking form options', () => {
  const emptyAvailability: AvailabilityPayload = {
    from: t('08:00'),
    to: t('17:00'),
    availableEmployees: [],
    availableVehicles: [],
  };

  it('does not fallback to all vehicles when availability is empty', () => {
    const options = resolveBookVehicleOptions(emptyAvailability, [VEHICLE_A, VEHICLE_B]);
    expect(options).toHaveLength(0);
  });

  it('does not fallback to all employees when availability is empty', () => {
    const options = resolveBookEmployeeOptions(emptyAvailability, [EMPLOYEE_1, EMPLOYEE_2]);
    expect(options).toHaveLength(0);
  });

  it('falls back to all active resources only when availability is not calculated', () => {
    expect(resolveBookVehicleOptions(null, [VEHICLE_A, VEHICLE_B])).toHaveLength(2);
    expect(resolveBookEmployeeOptions(null, [EMPLOYEE_1, EMPLOYEE_2])).toHaveLength(2);
  });

  it('excludes employees whose position is neither Common Driver nor Support Driver', () => {
    const otherPosition: Employee = { ...EMPLOYEE_2, id: 'emp-3', position: 'Temp Driver' };
    expect(resolveBookEmployeeOptions(null, [EMPLOYEE_1, otherPosition])).toHaveLength(1);

    const { from, to } = window('08:00', '17:00');
    const avail = computeBookingAvailability(from, to, [], [EMPLOYEE_1, otherPosition], [VEHICLE_A]);
    expect(avail.availableEmployees.map((e) => e.id)).toEqual([EMPLOYEE_1.id]);
  });

  it('includes employees whose position is Support Driver', () => {
    const supportDriver: Employee = { ...EMPLOYEE_2, id: 'emp-3', position: 'Support Driver' };
    expect(resolveBookEmployeeOptions(null, [EMPLOYEE_1, supportDriver])).toHaveLength(2);

    const { from, to } = window('08:00', '17:00');
    const avail = computeBookingAvailability(from, to, [], [EMPLOYEE_1, supportDriver], [VEHICLE_A]);
    expect(avail.availableEmployees.map((e) => e.id).sort()).toEqual([EMPLOYEE_1.id, supportDriver.id].sort());
  });
});

describe('effective_end in planner/dashboard overlap', () => {
  it('uses completed_at as effective_end instead of scheduled ends_at', () => {
    const b = booking({
      starts_at: t('08:00'),
      ends_at: t('17:00'),
      completed_at: t('12:00'),
    });
    expect(bookingEffectiveEnd(b).toISOString()).toBe(parseISO(t('12:00')).toISOString());
    expect(bookingBlocksWindow(b, parseISO(t('13:00')), parseISO(t('17:00')))).toBe(false);
    expect(bookingBlocksWindow(b, parseISO(t('11:00')), parseISO(t('13:00')))).toBe(true);
  });
});
