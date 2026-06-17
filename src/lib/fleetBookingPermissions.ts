import { apiFetch } from '@/lib/apiFetch';

export type FleetBookingPermissionEditor = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export type FleetBookingPermissions = {
  completed_time_editor_user_id: string | null;
  completed_time_editor: FleetBookingPermissionEditor | null;
  can_edit_completed_booking_times: boolean;
};

export async function fetchFleetBookingPermissions(): Promise<FleetBookingPermissions | null> {
  const r = await apiFetch('/api/fleet-booking-permissions');
  if (!r.ok) return null;
  return (await r.json()) as FleetBookingPermissions;
}

export async function fetchFleetPermissionCandidates(): Promise<FleetBookingPermissionEditor[]> {
  const r = await apiFetch('/api/fleet-booking-permissions?candidates=1');
  if (!r.ok) return [];
  const data = (await r.json()) as unknown;
  return Array.isArray(data) ? data : [];
}

export async function saveFleetBookingPermissions(
  editorUserId: string | null,
): Promise<{ ok: boolean; data?: FleetBookingPermissions; message?: string }> {
  const r = await apiFetch('/api/fleet-booking-permissions', {
    method: 'PATCH',
    body: JSON.stringify({ completed_time_editor_user_id: editorUserId }),
  });
  const body = (await r.json().catch(() => ({}))) as FleetBookingPermissions & { message?: string };
  if (!r.ok) {
    return { ok: false, message: body.message || 'บันทึกไม่สำเร็จ' };
  }
  return { ok: true, data: body };
}
