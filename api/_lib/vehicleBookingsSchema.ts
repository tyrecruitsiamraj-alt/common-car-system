import { dbQuery } from './postgres.js';
import { tableInAppSchema } from './schema.js';

let completedAtColumnExists: boolean | null = null;

/** ตรวจว่ามีคอลัมน์ completed_at (migration 027) — cache ต่อ process */
export async function hasVehicleBookingCompletedAt(): Promise<boolean> {
  if (completedAtColumnExists !== null) return completedAtColumnExists;
  try {
    const tbl = tableInAppSchema('vehicle_bookings');
    const schema = tbl.includes('.') ? tbl.split('.')[0]!.replace(/"/g, '') : 'public';
    const table = tbl.includes('.') ? tbl.split('.')[1]!.replace(/"/g, '') : tbl.replace(/"/g, '');
    const { rows } = await dbQuery<{ ok: number }>(
      `
      select 1 as ok
      from information_schema.columns
      where table_schema = $1
        and table_name = $2
        and column_name = 'completed_at'
      limit 1
    `,
      [schema, table],
    );
    completedAtColumnExists = rows.length > 0;
  } catch {
    completedAtColumnExists = false;
  }
  return completedAtColumnExists;
}

export function bookingEffectiveEndSql(useCompletedAt: boolean): string {
  return useCompletedAt ? 'coalesce(completed_at, ends_at)' : 'ends_at';
}

export function bookingEffectiveEndSqlQualified(tableAlias: string, useCompletedAt: boolean): string {
  const a = tableAlias.replace(/\./g, '');
  return useCompletedAt ? `coalesce(${a}.completed_at, ${a}.ends_at)` : `${a}.ends_at`;
}
