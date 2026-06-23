import { dbQuery } from './postgres.js';
import { tableInAppSchema } from './schema.js';

export const BOOKING_GUARD_IDS = [
  'btree_gist_extension',
  'vehicle_bookings_completed_at_column',
  'vehicle_bookings_status_column',
  'vehicle_bookings_status_check',
  'vehicle_bookings_vehicle_no_overlap',
  'vehicle_bookings_employee_no_overlap',
] as const;

export type BookingGuardId = (typeof BOOKING_GUARD_IDS)[number];

export type BookingGuardsStatus = 'ready' | 'degraded' | 'unavailable';

export type BookingProductionReadinessResult = {
  status: BookingGuardsStatus;
  schema: string;
  checks: Record<BookingGuardId, boolean>;
  allRequiredPresent: boolean;
};

function vehicleBookingsSchemaTable(): { schema: string; table: string } {
  const qualified = tableInAppSchema('vehicle_bookings');
  const m = /^"([^"]+)"\.([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(qualified);
  if (m) return { schema: m[1]!, table: m[2]! };
  return { schema: 'public', table: 'vehicle_bookings' };
}

function emptyChecks(): Record<BookingGuardId, boolean> {
  return {
    btree_gist_extension: false,
    vehicle_bookings_completed_at_column: false,
    vehicle_bookings_status_column: false,
    vehicle_bookings_status_check: false,
    vehicle_bookings_vehicle_no_overlap: false,
    vehicle_bookings_employee_no_overlap: false,
  };
}

export async function checkBookingProductionReadiness(): Promise<BookingProductionReadinessResult> {
  const { schema, table } = vehicleBookingsSchemaTable();
  const checks = emptyChecks();

  try {
    const [ext, cols, constraints] = await Promise.all([
      dbQuery<{ ok: number }>(
        `select 1 as ok from pg_extension where extname = 'btree_gist' limit 1`,
      ),
      dbQuery<{ column_name: string }>(
        `
        select column_name
        from information_schema.columns
        where table_schema = $1
          and table_name = $2
          and column_name in ('completed_at', 'status')
      `,
        [schema, table],
      ),
      dbQuery<{ conname: string }>(
        `
        select c.conname
        from pg_constraint c
        join pg_class t on c.conrelid = t.oid
        join pg_namespace n on t.relnamespace = n.oid
        where n.nspname = $1
          and t.relname = $2
          and c.conname in (
            'vehicle_bookings_status_check',
            'vehicle_bookings_vehicle_no_overlap',
            'vehicle_bookings_employee_no_overlap'
          )
      `,
        [schema, table],
      ),
    ]);

    checks.btree_gist_extension = ext.rows.length > 0;
    const colSet = new Set(cols.rows.map((r) => r.column_name));
    checks.vehicle_bookings_completed_at_column = colSet.has('completed_at');
    checks.vehicle_bookings_status_column = colSet.has('status');

    const conSet = new Set(constraints.rows.map((r) => r.conname));
    checks.vehicle_bookings_status_check = conSet.has('vehicle_bookings_status_check');
    checks.vehicle_bookings_vehicle_no_overlap = conSet.has('vehicle_bookings_vehicle_no_overlap');
    checks.vehicle_bookings_employee_no_overlap = conSet.has('vehicle_bookings_employee_no_overlap');

    const allRequiredPresent = BOOKING_GUARD_IDS.every((id) => checks[id]);
    return {
      status: allRequiredPresent ? 'ready' : 'degraded',
      schema,
      checks,
      allRequiredPresent,
    };
  } catch {
    return {
      status: 'unavailable',
      schema,
      checks,
      allRequiredPresent: false,
    };
  }
}

/** Safe payload for /api/health — booleans only, no connection details. */
export function bookingGuardsHealthPayload(result: BookingProductionReadinessResult) {
  return {
    status: result.status,
    schema: result.schema,
    checks: result.checks,
    allRequiredPresent: result.allRequiredPresent,
  };
}

export function missingBookingGuardIds(result: BookingProductionReadinessResult): BookingGuardId[] {
  return BOOKING_GUARD_IDS.filter((id) => !result.checks[id]);
}
