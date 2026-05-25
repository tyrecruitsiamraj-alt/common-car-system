import { parseYmd } from '@/lib/dateTh';

export type ExportYmdRange = { fromYmd: string; toYmd: string };

export function isValidExportYmdRange(fromYmd: string, toYmd: string): boolean {
  const f = parseYmd(fromYmd);
  const t = parseYmd(toYmd);
  if (!f || !t) return false;
  return fromYmd <= toYmd;
}

/** ช่วงดึงข้อมูลจาก API vehicle-bookings (from รวม, to ไม่รวม — ตรงกับ backend) */
export function ymdRangeToFetchIsoBounds(
  fromYmd: string,
  toYmd: string,
): { fromIso: string; toIso: string } | null {
  if (!isValidExportYmdRange(fromYmd, toYmd)) return null;
  const from = new Date(`${fromYmd}T00:00:00`);
  const t = parseYmd(toYmd)!;
  const toExclusive = new Date(t.y, t.m - 1, t.d + 1);
  return { fromIso: from.toISOString(), toIso: toExclusive.toISOString() };
}

export function exportFilenameDateSuffix(fromYmd: string, toYmd: string): string {
  return fromYmd === toYmd ? fromYmd : `${fromYmd}_to_${toYmd}`;
}
