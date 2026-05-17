import { dbQuery } from './postgres.js';
import { tableInAppSchema } from './schema.js';

const tbl = tableInAppSchema('vehicle_booking_audit');

export type BookingAuditAction = 'created' | 'updated' | 'cancelled';

export type BookingAuditRow = {
  id: string;
  booking_id: string;
  user_id: string | null;
  user_name: string;
  action: BookingAuditAction;
  old_value: unknown;
  new_value: unknown;
  created_at: string | Date;
};

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

export function toBookingAuditResponse(row: BookingAuditRow) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    user_id: row.user_id ?? undefined,
    user_name: row.user_name,
    action: row.action,
    old_value: row.old_value ?? undefined,
    new_value: row.new_value ?? undefined,
    created_at: toIso(row.created_at),
  };
}

export async function insertBookingAudit(params: {
  bookingId: string;
  userId: string | null;
  userName: string;
  action: BookingAuditAction;
  oldValue: unknown;
  newValue: unknown;
}): Promise<void> {
  await dbQuery(
    `
      insert into ${tbl} (booking_id, user_id, user_name, action, old_value, new_value)
      values ($1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::jsonb)
    `,
    [
      params.bookingId,
      params.userId,
      params.userName,
      params.action,
      params.oldValue != null ? JSON.stringify(params.oldValue) : null,
      params.newValue != null ? JSON.stringify(params.newValue) : null,
    ],
  );
}

export async function listBookingAuditInRange(fromIso: string, toIso: string, limit = 200) {
  const { rows } = await dbQuery<BookingAuditRow>(
    `
      select a.*
      from ${tbl} a
      inner join ${tableInAppSchema('vehicle_bookings')} b on b.id = a.booking_id
      where b.starts_at < $2::timestamptz and b.ends_at > $1::timestamptz
      order by a.created_at desc
      limit $3
    `,
    [fromIso, toIso, limit],
  );
  return rows.map(toBookingAuditResponse);
}
