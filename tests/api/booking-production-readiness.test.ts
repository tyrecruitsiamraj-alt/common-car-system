// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/_lib/postgres.js', () => ({
  dbQuery: vi.fn(),
}));

vi.mock('../../api/_lib/schema.js', () => ({
  tableInAppSchema: (table: string) => `"car_stamp".${table}`,
}));

import { dbQuery } from '../../api/_lib/postgres.js';
import {
  BOOKING_GUARD_IDS,
  checkBookingProductionReadiness,
  missingBookingGuardIds,
  bookingGuardsHealthPayload,
} from '../../api/_lib/bookingProductionReadiness.js';

const mockedDbQuery = vi.mocked(dbQuery);

function mockAllGuardsPresent() {
  mockedDbQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('pg_extension')) {
      return { rows: [{ ok: 1 }], rowCount: 1 };
    }
    if (sql.includes('information_schema.columns')) {
      return {
        rows: [{ column_name: 'completed_at' }, { column_name: 'status' }],
        rowCount: 2,
      };
    }
    if (sql.includes('pg_constraint')) {
      return {
        rows: [
          { conname: 'vehicle_bookings_status_check' },
          { conname: 'vehicle_bookings_vehicle_no_overlap' },
          { conname: 'vehicle_bookings_employee_no_overlap' },
        ],
        rowCount: 3,
      };
    }
    return { rows: [], rowCount: 0 };
  });
}

describe('checkBookingProductionReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports ready when all required guards exist', async () => {
    mockAllGuardsPresent();
    const result = await checkBookingProductionReadiness();
    expect(result.status).toBe('ready');
    expect(result.schema).toBe('car_stamp');
    expect(result.allRequiredPresent).toBe(true);
    for (const id of BOOKING_GUARD_IDS) {
      expect(result.checks[id]).toBe(true);
    }
  });

  it('reports degraded when overlap constraints are missing', async () => {
    mockAllGuardsPresent();
    mockedDbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('pg_constraint')) {
        return { rows: [{ conname: 'vehicle_bookings_status_check' }], rowCount: 1 };
      }
      if (sql.includes('pg_extension')) {
        return { rows: [{ ok: 1 }], rowCount: 1 };
      }
      if (sql.includes('information_schema.columns')) {
        return {
          rows: [{ column_name: 'completed_at' }, { column_name: 'status' }],
          rowCount: 2,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const result = await checkBookingProductionReadiness();
    expect(result.status).toBe('degraded');
    expect(result.checks.vehicle_bookings_vehicle_no_overlap).toBe(false);
    expect(result.checks.vehicle_bookings_employee_no_overlap).toBe(false);
    expect(missingBookingGuardIds(result)).toEqual([
      'vehicle_bookings_vehicle_no_overlap',
      'vehicle_bookings_employee_no_overlap',
    ]);
  });

  it('reports unavailable when database queries fail', async () => {
    mockedDbQuery.mockRejectedValue(new Error('connection refused'));
    const result = await checkBookingProductionReadiness();
    expect(result.status).toBe('unavailable');
    expect(result.allRequiredPresent).toBe(false);
  });

  it('health payload exposes only safe structured fields', async () => {
    mockAllGuardsPresent();
    const result = await checkBookingProductionReadiness();
    const payload = bookingGuardsHealthPayload(result);
    expect(payload).toEqual({
      status: 'ready',
      schema: 'car_stamp',
      allRequiredPresent: true,
      checks: result.checks,
    });
    expect(JSON.stringify(payload)).not.toMatch(/password|postgresql:\/\//i);
  });
});
