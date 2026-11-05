/**
 * แปลงค่าคอลัมน์ date เป็น YYYY-MM-DD
 * pg สร้าง Date จากคอลัมน์ date เป็นเที่ยงคืนตามเวลาท้องถิ่น จึงต้องอ่านด้วย local getter
 * ถ้าใช้ toISOString วันที่จะถอยไป 1 วันเมื่อ server อยู่ timezone ที่เร็วกว่า UTC
 */
export function dateColumnToYmd(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}
