import { dbQuery } from './postgres.js';
import { tableInAppSchema } from './schema.js';

const tbl = tableInAppSchema('user_permissions');

let tableReady: boolean | null = null;

/**
 * สร้างตารางแบบ lazy ตอนเรียกใช้จริง — เผื่อ deploy โค้ดนี้ก่อน migration 044 รัน (ดู incident เดิมเรื่อง
 * employees/pending_* columns) ตามแพทเทิร์นเดียวกับ ensureFleetBookingPermissionsTable()
 */
export async function ensureUserPermissionsTable(): Promise<boolean> {
  if (tableReady) return true;
  try {
    await dbQuery(`
      create table if not exists ${tbl} (
        user_id uuid not null,
        capability text not null,
        granted_at timestamptz not null default now(),
        granted_by_user_id uuid null,
        primary key (user_id, capability)
      )
    `);
    tableReady = true;
    return true;
  } catch {
    tableReady = false;
    return false;
  }
}

export async function userHasCapability(userId: string, capability: string): Promise<boolean> {
  if (!userId) return false;
  if (!(await ensureUserPermissionsTable())) return false;
  const { rows } = await dbQuery<{ user_id: string }>(
    `select user_id from ${tbl} where user_id = $1::uuid and capability = $2 limit 1`,
    [userId, capability],
  );
  return rows.length > 0;
}

export async function listUserIdsWithCapability(capability: string): Promise<string[]> {
  if (!(await ensureUserPermissionsTable())) return [];
  const { rows } = await dbQuery<{ user_id: string }>(
    `select user_id from ${tbl} where capability = $1`,
    [capability],
  );
  return rows.map((r) => r.user_id);
}

export async function setUserCapability(
  userId: string,
  capability: string,
  granted: boolean,
  grantedByUserId: string | null,
): Promise<void> {
  if (!(await ensureUserPermissionsTable())) {
    throw new Error('user_permissions table not ready');
  }
  if (granted) {
    await dbQuery(
      `insert into ${tbl} (user_id, capability, granted_by_user_id)
       values ($1::uuid, $2, $3::uuid)
       on conflict (user_id, capability) do update set granted_by_user_id = excluded.granted_by_user_id, granted_at = now()`,
      [userId, capability, grantedByUserId],
    );
  } else {
    await dbQuery(`delete from ${tbl} where user_id = $1::uuid and capability = $2`, [userId, capability]);
  }
}
