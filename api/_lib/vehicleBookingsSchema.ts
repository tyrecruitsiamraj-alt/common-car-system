import { getPgSchema } from './env.js';
import { dbQuery } from './postgres.js';
import { tableInAppSchema } from './schema.js';

let completedAtColumnExists: boolean | null = null;
let workOrderInfrastructureReady: boolean | null = null;
let documentNoColumnReady: boolean | null = null;
let jobTypeColumnReady: boolean | null = null;
let cancelReasonColumnReady: boolean | null = null;

function vehicleBookingsSchemaTable(): { schema: string; table: string; qualified: string } {
  const qualified = tableInAppSchema('vehicle_bookings');
  const m = /^"([^"]+)"\.([a-zA-Z_][a-zA-Z0-9_]*)$/.exec(qualified);
  if (m) return { schema: m[1], table: m[2], qualified };
  return { schema: 'public', table: qualified.replace(/"/g, ''), qualified };
}

export function resetVehicleBookingCompletedAtCache(): void {
  completedAtColumnExists = null;
}

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

/** สร้างคอลัมน์ completed_at ถ้ายังไม่มี (กดเสร็จสิ้นต้องใช้คอลัมน์นี้) */
export async function ensureVehicleBookingCompletedAt(): Promise<boolean> {
  if (await hasVehicleBookingCompletedAt()) return true;
  try {
    const tbl = tableInAppSchema('vehicle_bookings');
    await dbQuery(`alter table ${tbl} add column if not exists completed_at timestamptz null`);
    completedAtColumnExists = true;
    return true;
  } catch {
    completedAtColumnExists = false;
    return false;
  }
}

/** ช่วงครอบคลุมสำหรับทับซ้อน/ว่าง — coalesce(completed_at, ends_at) เมื่อมีคอลัมน์ completed_at */
export function bookingEffectiveEndSql(useCompletedAt: boolean): string {
  return useCompletedAt ? 'coalesce(completed_at, ends_at)' : 'ends_at';
}

export function bookingEffectiveEndSqlQualified(tableAlias: string, useCompletedAt: boolean): string {
  const a = tableAlias.replace(/\./g, '');
  return useCompletedAt
    ? `coalesce(${a}.completed_at, ${a}.ends_at)`
    : `${a}.ends_at`;
}

/** สร้างคอลัมน์ document_no ถ้ายังไม่มี (migration 030) */
export async function ensureVehicleBookingDocumentNo(): Promise<boolean> {
  if (documentNoColumnReady) return true;
  try {
    const tbl = tableInAppSchema('vehicle_bookings');
    await dbQuery(`alter table ${tbl} add column if not exists document_no text null`);
    documentNoColumnReady = true;
    return true;
  } catch {
    documentNoColumnReady = false;
    return false;
  }
}

/** สร้างคอลัมน์ job_type ถ้ายังไม่มี (migration 035) */
export async function ensureVehicleBookingJobType(): Promise<boolean> {
  if (jobTypeColumnReady) return true;
  try {
    const tbl = tableInAppSchema('vehicle_bookings');
    await dbQuery(`alter table ${tbl} add column if not exists job_type text null`);
    jobTypeColumnReady = true;
    return true;
  } catch {
    jobTypeColumnReady = false;
    return false;
  }
}

/** สร้างคอลัมน์ cancel_reason ถ้ายังไม่มี (migration 036) */
export async function ensureVehicleBookingCancelReason(): Promise<boolean> {
  if (cancelReasonColumnReady) return true;
  try {
    const tbl = tableInAppSchema('vehicle_bookings');
    await dbQuery(`alter table ${tbl} add column if not exists cancel_reason text null`);
    cancelReasonColumnReady = true;
    return true;
  } catch {
    cancelReasonColumnReady = false;
    return false;
  }
}

/** สร้าง sequence + คอลัมน์ work_order_no ถ้ายังไม่มี (migration 029 ยังไม่รันบน schema นี้) */
export async function ensureVehicleBookingWorkOrderNo(): Promise<boolean> {
  if (workOrderInfrastructureReady) return true;
  const { schema, qualified } = vehicleBookingsSchemaTable();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) return false;
  const seq = `"${schema}".vehicle_bookings_work_order_seq`;
  try {
    await dbQuery(`create sequence if not exists ${seq} start 1`);
    await dbQuery(`alter table ${qualified} add column if not exists work_order_no text null`);
    await dbQuery(
      `
      select setval(
        '${schema}.vehicle_bookings_work_order_seq'::regclass,
        coalesce(
          (
            select max(cast(substring(work_order_no from 4) as integer))
            from ${qualified}
            where work_order_no ~ '^BK-[0-9]+$'
          ),
          0
        ) + 1,
        false
      )
    `,
    );
    await dbQuery(
      `
      create unique index if not exists vehicle_bookings_work_order_no_uidx
      on ${qualified} (work_order_no)
      where work_order_no is not null
    `,
    ).catch(() => undefined);
    workOrderInfrastructureReady = true;
    return true;
  } catch {
    workOrderInfrastructureReady = false;
    return false;
  }
}

/** เลขใบงานถัดไป — ใช้ sequence; ถ้าไม่มีจะพยายาม ensure แล้ว fallback เป็น max+1 */
export async function allocateVehicleBookingWorkOrderNo(): Promise<string> {
  const { qualified } = vehicleBookingsSchemaTable();
  const schema = getPgSchema().replace(/"/g, '');
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error('Invalid database schema for work order sequence');
  }

  const tryNextval = async (): Promise<string | null> => {
    try {
      const { rows } = await dbQuery<{ n: string }>(
        `select 'BK-' || lpad(nextval('${schema}.vehicle_bookings_work_order_seq'::regclass)::text, 6, '0') as n`,
      );
      const n = rows[0]?.n?.trim();
      return n || null;
    } catch {
      return null;
    }
  };

  let n = await tryNextval();
  if (n) return n;

  await ensureVehicleBookingWorkOrderNo();
  n = await tryNextval();
  if (n) return n;

  const { rows } = await dbQuery<{ n: number }>(
    `
    select coalesce(
      max(
        case
          when work_order_no ~ '^BK-[0-9]+$'
          then cast(substring(work_order_no from 4) as integer)
          else 0
        end
      ),
      0
    ) + 1 as n
    from ${qualified}
  `,
  );
  const next = rows[0]?.n ?? 1;
  return `BK-${String(next).padStart(6, '0')}`;
}
