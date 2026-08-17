import { describe, expect, it } from 'vitest';
import { buildDashboardData } from '@/lib/dashboard/buildDashboardData';
import { resolveDashboardPeriodRange } from '@/lib/fleetDashboardStats';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

function booking(partial: Partial<VehicleBooking> & Pick<VehicleBooking, 'starts_at' | 'ends_at'>): VehicleBooking {
  return {
    id: partial.id ?? 'b1',
    employee_id: partial.employee_id ?? 'e1',
    vehicle_id: partial.vehicle_id ?? 'v1',
    status: partial.status ?? 'active',
    created_at: partial.created_at ?? partial.starts_at,
    updated_at: partial.updated_at ?? partial.starts_at,
    ...partial,
  };
}

describe('buildDashboardData', () => {
  const employees: Employee[] = [
    {
      id: 'e1',
      employee_code: 'EMP-1',
      first_name: 'สมชาย',
      last_name: 'ใจดี',
      phone: '081',
      status: 'active',
      position: 'ขับรถ',
      join_date: '2024-01-01',
      reliability_score: 90,
      utilization_rate: 80,
      total_days_worked: 10,
      total_income: 0,
      total_cost: 0,
      total_issues: 0,
      created_at: '2024-01-01',
    },
  ];
  const vehicles: Vehicle[] = [
    {
      id: 'v1',
      plate_no: 'กข 1234',
      label: 'Camry',
      seats: 5,
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  it('aggregates KPIs and status slices from bookings', () => {
    const now = new Date('2026-05-15T12:00:00');
    const bookings: VehicleBooking[] = [
      booking({
        id: '1',
        starts_at: '2026-05-10T08:00:00.000Z',
        ends_at: '2026-05-10T12:00:00.000Z',
        completed_at: '2026-05-10T11:30:00.000Z',
        destination: 'สำนักงานใหญ่',
      }),
      booking({
        id: '2',
        starts_at: '2026-05-12T08:00:00.000Z',
        ends_at: '2026-05-12T10:00:00.000Z',
        destination: 'คลังบางนา',
      }),
    ];
    const range = resolveDashboardPeriodRange('this_month', undefined, undefined, now);
    const data = buildDashboardData(bookings, employees, vehicles, range, {
      status: 'all',
      ownerId: '',
      vehicleId: '',
      periodPreset: 'this_month',
      customFromYmd: '2026-05-01',
      customToYmd: '2026-05-31',
      search: '',
    });
    expect(data.kpis.find((k) => k.id === 'total')?.value).toBe('2');
    expect(data.statusSlices.length).toBeGreaterThan(0);
    expect(data.statusSlices.find((s) => s.status === 'completed')?.count).toBe(1);
  });
});
