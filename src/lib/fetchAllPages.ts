import { apiFetch } from '@/lib/apiFetch';

/** ดึงข้อมูลแบบแบ่งหน้าจนครบ เพื่อไม่ให้ยอดสถิติขาดโดยไม่รู้ตัวเมื่อข้อมูลเกินเพดานต่อหน้าของ API */
export async function fetchAllPages<T extends { id: string }>(path: string, pageSize: number): Promise<T[]> {
  const byId = new Map<string, T>();
  const separator = path.includes('?') ? '&' : '?';
  for (let offset = 0; ; offset += pageSize) {
    const r = await apiFetch(`${path}${separator}limit=${pageSize}&offset=${offset}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const batch = (await r.json()) as T[];
    batch.forEach((row) => byId.set(row.id, row));
    if (batch.length < pageSize) return [...byId.values()];
  }
}
