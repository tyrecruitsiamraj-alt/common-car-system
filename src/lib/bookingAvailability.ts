import { parseISO } from 'date-fns';
import { bookingEffectiveEnd } from '@/lib/fleetBookingsDashboard';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

export type AvailabilityPayload = {
  from: string;
  to: string;
  availableEmployees: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_code'>[];
  availableVehicles: Pick<Vehicle, 'id' | 'plate_no' | 'label' | 'seats'>[];
};

type BookingWindowFields = Pick<VehicleBooking, 'status' | 'starts_at' | 'ends_at' | 'completed_at'>;

/** Same rule as API overlap SQL: starts_at < windowEnd AND effective_end > windowStart; cancelled ignored */
export function bookingBlocksWindow(
  b: BookingWindowFields,
  from: Date,
  to: Date,
): boolean {
  if (b.status === 'cancelled') return false;
  const s = parseISO(b.starts_at);
  const e = bookingEffectiveEnd(b as VehicleBooking);
  return s < to && e > from;
}

export function hasVehicleBookingConflict(
  bookings: VehicleBooking[],
  vehicleId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): boolean {
  return bookings.some(
    (b) =>
      b.vehicle_id === vehicleId &&
      b.id !== excludeBookingId &&
      bookingBlocksWindow(b, startsAt, endsAt),
  );
}

export function hasEmployeeBookingConflict(
  bookings: VehicleBooking[],
  employeeId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): boolean {
  return bookings.some(
    (b) =>
      b.employee_id === employeeId &&
      b.id !== excludeBookingId &&
      bookingBlocksWindow(b, startsAt, endsAt),
  );
}

/** Client-side availability — mirrors API availability query */
export function computeBookingAvailability(
  from: Date,
  to: Date,
  bookingRows: VehicleBooking[],
  employees: Employee[],
  vehicles: Vehicle[],
): AvailabilityPayload {
  const busyEmp = new Set(
    bookingRows.filter((b) => bookingBlocksWindow(b, from, to)).map((b) => b.employee_id),
  );
  const busyVeh = new Set(
    bookingRows.filter((b) => bookingBlocksWindow(b, from, to)).map((b) => b.vehicle_id),
  );
  const availableEmployees = employees
    .filter((e) => e.status === 'active' && !busyEmp.has(e.id))
    .map((e) => ({
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      employee_code: e.employee_code,
    }))
    .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'th'));
  const availableVehicles = vehicles
    .filter((v) => v.is_active !== false && !busyVeh.has(v.id))
    .map((v) => ({
      id: v.id,
      plate_no: v.plate_no,
      label: v.label,
      seats: v.seats,
    }))
    .sort((a, b) => a.plate_no.localeCompare(b.plate_no, 'th'));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    availableEmployees,
    availableVehicles,
  };
}

/** Booking form options — trust availability when calculated, even if empty */
export function resolveBookEmployeeOptions(
  displayAvailability: AvailabilityPayload | null,
  employees: Employee[],
): AvailabilityPayload['availableEmployees'] {
  if (displayAvailability) {
    return displayAvailability.availableEmployees;
  }
  return employees
    .filter((e) => e.status !== 'inactive' && e.status !== 'suspended')
    .map((e) => ({
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      employee_code: e.employee_code,
    }));
}

export function resolveBookVehicleOptions(
  displayAvailability: AvailabilityPayload | null,
  vehicles: Vehicle[],
): AvailabilityPayload['availableVehicles'] {
  if (displayAvailability) {
    return displayAvailability.availableVehicles;
  }
  return vehicles
    .filter((v) => v.is_active !== false)
    .map((v) => ({
      id: v.id,
      plate_no: v.plate_no,
      label: v.label,
      seats: v.seats,
    }));
}
