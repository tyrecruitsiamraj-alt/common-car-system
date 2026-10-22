import { apiFetch } from '@/lib/apiFetch';
import { isDemoMode } from '@/lib/demoMode';
import type { DriverTmaProfile } from '@/types';
import type { DriverTmaProfileFieldsValue } from '@/components/wl/DriverTmaProfileFields';
import { DRIVER_TMA_PROFILE_FIELDS } from '@/lib/driverTmaProfileFieldDefs';

export function driverTmaProfileToFields(p: DriverTmaProfile | undefined): DriverTmaProfileFieldsValue {
  const out: DriverTmaProfileFieldsValue = {};
  for (const field of DRIVER_TMA_PROFILE_FIELDS) {
    const raw = p ? (p as unknown as Record<string, unknown>)[field.dbField] : undefined;
    out[field.key] = raw === undefined || raw === null ? '' : String(raw);
  }
  return out;
}

export function isBlankDriverTmaProfileFields(v: DriverTmaProfileFieldsValue): boolean {
  return Object.values(v).every((x) => !x.trim());
}

/**
 * บันทึกฟิลด์เสริมจาก Database TMA ที่แก้ไขผ่าน UI ได้ (ดู src/lib/driverTmaProfileFieldDefs.ts และ api/_handlers/driver-tma-profiles.ts)
 * โหมดสาธิตไม่มีตารางนี้ จึงข้ามการบันทึกไปเงียบๆ
 */
export async function saveDriverTmaProfileFields(
  employeeId: string,
  fields: DriverTmaProfileFieldsValue,
): Promise<void> {
  if (isDemoMode()) return;

  const body: Record<string, string> = { employee_id: employeeId };
  for (const field of DRIVER_TMA_PROFILE_FIELDS) {
    body[field.dbField] = (fields[field.key] ?? '').trim();
  }

  const r = await apiFetch('/api/driver-tma-profiles', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const body2 = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body2?.message || body2?.error || 'บันทึกข้อมูลเสริมไม่สำเร็จ');
  }
}
