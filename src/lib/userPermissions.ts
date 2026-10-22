import { apiFetch } from '@/lib/apiFetch';

/** ต้องตรงกับ DELETE_COMPLAINTS_CAPABILITY ฝั่ง backend (api/_handlers/issue-reports.ts) */
export const DELETE_COMPLAINTS_CAPABILITY = 'delete_complaints';

export type CapabilityStatus = {
  capability: string;
  /** ผู้ใช้ปัจจุบันมีสิทธิ์นี้ไหม (admin ได้เสมอ) */
  granted: boolean;
  /** รายชื่อ user id ที่ได้รับสิทธิ์นี้ — มีเฉพาะตอนผู้ใช้ปัจจุบันเป็น admin */
  grantedUserIds?: string[];
};

export async function fetchCapabilityStatus(capability: string): Promise<CapabilityStatus | null> {
  const r = await apiFetch(`/api/user-permissions?capability=${encodeURIComponent(capability)}`);
  if (!r.ok) return null;
  return (await r.json()) as CapabilityStatus;
}

export async function setUserCapabilityGrant(
  userId: string,
  capability: string,
  granted: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const r = await apiFetch('/api/user-permissions', {
    method: 'PUT',
    body: JSON.stringify({ user_id: userId, capability, granted }),
  });
  const body = (await r.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!r.ok) {
    return { ok: false, message: body.message || body.error || 'บันทึกสิทธิ์ไม่สำเร็จ' };
  }
  return { ok: true };
}
