import { dbQuery } from './postgres.js';
import { tableInAppSchema } from './schema.js';

const tbl = tableInAppSchema('fleet_booking_permissions');
const usersTbl = tableInAppSchema('users');

const ROW_ID = 'default';

let tableReady: boolean | null = null;

type PermRow = {
  completed_time_editor_user_id: string | null;
};

type EditorRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export async function ensureFleetBookingPermissionsTable(): Promise<boolean> {
  if (tableReady) return true;
  try {
    await dbQuery(`
      create table if not exists ${tbl} (
        id text primary key default 'default',
        completed_time_editor_user_id uuid null,
        updated_at timestamptz not null default now(),
        updated_by_user_id uuid null
      )
    `);
    await dbQuery(`insert into ${tbl} (id) values ('default') on conflict (id) do nothing`).catch(
      () => undefined,
    );
    tableReady = true;
    return true;
  } catch {
    tableReady = false;
    return false;
  }
}

export async function getCompletedTimeEditorUserId(): Promise<string | null> {
  if (!(await ensureFleetBookingPermissionsTable())) return null;
  const { rows } = await dbQuery<PermRow>(
    `select completed_time_editor_user_id from ${tbl} where id = $1 limit 1`,
    [ROW_ID],
  );
  return rows[0]?.completed_time_editor_user_id ?? null;
}

export async function userCanEditCompletedBookingTimes(userId: string): Promise<boolean> {
  const editorId = await getCompletedTimeEditorUserId();
  if (!editorId || !userId) return false;
  return editorId === userId;
}

export async function getCompletedTimeEditorProfile(): Promise<EditorRow | null> {
  const editorId = await getCompletedTimeEditorUserId();
  if (!editorId) return null;
  const { rows } = await dbQuery<EditorRow>(
    `select id, email, full_name, role, is_active from ${usersTbl} where id = $1::uuid limit 1`,
    [editorId],
  );
  return rows[0] ?? null;
}

export async function setCompletedTimeEditorUserId(
  editorUserId: string | null,
  updatedByUserId: string | null,
): Promise<void> {
  if (!(await ensureFleetBookingPermissionsTable())) {
    throw new Error('fleet_booking_permissions table not ready');
  }
  if (editorUserId) {
    const { rows } = await dbQuery<{ id: string }>(
      `select id from ${usersTbl} where id = $1::uuid and is_active = true limit 1`,
      [editorUserId],
    );
    if (!rows[0]) throw new Error('User not found or inactive');
  }
  await dbQuery(
    `
    update ${tbl}
    set
      completed_time_editor_user_id = $2::uuid,
      updated_at = now(),
      updated_by_user_id = $3::uuid
    where id = $1
    `,
    [ROW_ID, editorUserId, updatedByUserId],
  );
}
