import type { SearchablePickerOption } from '@/components/shared/SearchablePicker';
import { DRIVER_LIST_POSITIONS, PERSONAL_DRIVER_POSITIONS } from '@/lib/driverListPositions';

export type ExamDirectoryEntry = {
  first_name: string;
  last_name: string;
  position?: string | null;
};

/** ข้อสอบใช้กับคนขับทุกกลุ่ม รวม Position Driver ที่เป็นคนขับส่วนใหญ่ของระบบ */
const EXAM_DRIVER_POSITIONS = new Set<string>([...DRIVER_LIST_POSITIONS, ...PERSONAL_DRIVER_POSITIONS]);

/**
 * ตัวเลือกชื่อคนขับในข้อสอบ — ใช้ "ชื่อ นามสกุล" ไม่มีคำนำหน้า ให้ตรงกับผลข้อสอบที่บันทึกไว้เดิม
 * เพราะหน้าผลข้อสอบนับจำนวนคนไม่ซ้ำจากข้อความนี้ และตัดชื่อซ้ำออกเพราะค่าที่เลือกคือตัวชื่อเอง
 */
export function examDriverPickerOptions(entries: ExamDirectoryEntry[]): SearchablePickerOption[] {
  const names = new Set<string>();
  for (const entry of entries) {
    if (!EXAM_DRIVER_POSITIONS.has(entry.position ?? '')) continue;
    const name = [entry.first_name, entry.last_name]
      .map((part) => (part ?? '').trim())
      .filter(Boolean)
      .join(' ');
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'th')).map((name) => ({ value: name, label: name }));
}
