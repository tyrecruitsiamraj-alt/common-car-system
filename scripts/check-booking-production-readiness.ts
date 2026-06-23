/**
 * Verify vehicle_bookings production guards (migration 034 + prerequisites).
 *
 * Usage:
 *   npm run db:check:booking-production-readiness
 */
import '../server/bootstrap-env.ts';

import {
  BOOKING_GUARD_IDS,
  checkBookingProductionReadiness,
  missingBookingGuardIds,
} from '../api/_lib/bookingProductionReadiness.ts';
import { getDatabaseUrl } from '../api/_lib/env.ts';
import { DATABASE_CONNECTION_ENV_HINT } from '../api/_lib/env.ts';

const databaseUrl = getDatabaseUrl()?.trim();
if (!databaseUrl) {
  console.error(`Missing database connection. ${DATABASE_CONNECTION_ENV_HINT}`);
  process.exit(2);
}

const result = await checkBookingProductionReadiness();

console.log(`Schema: ${result.schema}`);
console.log(`Status: ${result.status}`);
for (const id of BOOKING_GUARD_IDS) {
  console.log(`  ${result.checks[id] ? 'OK' : 'MISSING'}  ${id}`);
}

if (result.status === 'unavailable') {
  console.error('Could not verify booking production readiness (database query failed).');
  process.exit(2);
}

if (!result.allRequiredPresent) {
  const missing = missingBookingGuardIds(result);
  console.error(`Missing required booking guards: ${missing.join(', ')}`);
  console.error('Run: npm run db:check:booking-overlaps && npm run db:migrate');
  process.exit(1);
}

console.log('All vehicle booking production guards are present.');
process.exit(0);
