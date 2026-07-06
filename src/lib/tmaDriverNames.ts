import names from '@/data/tmaDriverNames.json';
import type { SearchablePickerOption } from '@/components/shared/SearchablePicker';

/** รายชื่อไดร์เวอร์ TMA — จาก Database June 2026 TMA (sheet Position) */
export const TMA_DRIVER_NAMES: string[] = names;

export function tmaDriverPickerOptions(): SearchablePickerOption[] {
  return TMA_DRIVER_NAMES.map((name) => ({
    value: name,
    label: name,
  }));
}

export function isTmaDriverName(value: string): boolean {
  const k = value.trim().toLowerCase();
  return TMA_DRIVER_NAMES.some((n) => n.toLowerCase() === k);
}
