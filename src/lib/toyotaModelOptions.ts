/**
 * รุ่นรถ Toyota + รุ่นย่อย/เกรด (trim) ของแต่ละรุ่น — ใช้ในฟอร์มเพิ่ม/แก้ไขรถที่หน้า /fleet/vehicles
 * ค่าสุดท้ายที่บันทึกคือข้อความเดียว (คอลัมน์ `label` ของตาราง vehicles ไม่ได้แยกคอลัมน์รุ่นย่อย)
 * เช่น "Toyota Hilux Revo Rocco" หรือ "Toyota Hiace Standard"
 * รายชื่อรุ่นย่อยเป็นข้อมูลอ้างอิงโดยประมาณ ปรับ/เพิ่มได้ตามจริง — ถ้าไม่ตรงเลือก "อื่นๆ" แล้วพิมพ์เองได้เสมอ
 */

/** รุ่น Toyota เท่านั้น — เดิมอยู่ใน FleetVehicles.tsx ย้ายมารวมกับรุ่นย่อยที่นี่ */
export const TOYOTA_MODEL_OPTIONS = [
  'Toyota Yaris',
  'Toyota Yaris Ativ',
  'Toyota Vios',
  'Toyota Corolla Altis',
  'Toyota Corolla Cross',
  'Toyota Camry',
  'Toyota Fortuner',
  'Toyota Hilux Revo',
  'Toyota Hilux Champion',
  'Toyota Innova',
  'Toyota Innova Zenix',
  'Toyota Alphard',
  'Toyota Veloz',
  'Toyota Avanza',
  'Toyota Rush',
  'Toyota C-HR',
  'Toyota Hiace',
  'Toyota Commuter',
  'Toyota Granvia',
] as const;

export type ToyotaModel = (typeof TOYOTA_MODEL_OPTIONS)[number];

/** รุ่นย่อย/เกรดโดยประมาณของแต่ละรุ่น — ไม่มีในรายการก็เลือก "อื่นๆ" แล้วพิมพ์เองได้ */
export const TOYOTA_MODEL_TRIMS: Record<string, string[]> = {
  'Toyota Yaris': ['Entry', 'Sport', 'Premium', 'GR Sport'],
  'Toyota Yaris Ativ': ['Entry', 'Sport', 'Premium', 'GR Sport'],
  'Toyota Vios': ['Entry', 'Sport', 'Premium', 'GR Sport'],
  'Toyota Corolla Altis': ['GX', 'Sport', 'HEV Premium', 'GR Sport'],
  'Toyota Corolla Cross': ['Mid', 'Premium', 'Hybrid Premium Safety', 'GR Sport'],
  'Toyota Camry': ['Standard', 'HEV Premium', 'HEV Premium Luxury'],
  'Toyota Fortuner': ['Standard 4x2', 'Sportivo 4x2', 'Sportivo 4x4', 'Legender'],
  'Toyota Hilux Revo': ['Standard Cab', 'Smart Cab', 'Double Cab Entry', 'Prerunner', '4x4', 'Rocco', 'GR Sport'],
  'Toyota Hilux Champion': ['Standard Cab', 'Smart Cab', 'Double Cab'],
  'Toyota Innova': ['G', 'V'],
  'Toyota Innova Zenix': ['V', 'Z Hybrid'],
  'Toyota Alphard': ['Hybrid Executive Lounge'],
  'Toyota Veloz': ['Standard', 'Premium'],
  'Toyota Avanza': ['Standard', 'Premium'],
  'Toyota Rush': ['Standard', 'Premium'],
  'Toyota C-HR': ['Mid', 'High', 'Hybrid'],
  'Toyota Hiace': ['Standard', 'Deluxe', 'Super Grandia', 'VIP'],
  'Toyota Commuter': ['Standard', 'Deluxe', 'VIP'],
  'Toyota Granvia': ['Premium'],
};

/** sentinel สำหรับ "อื่นๆ" ที่ตัวเลือกหลัก (ไม่ใช่รุ่น Toyota ในรายการ หรือยี่ห้ออื่น) */
export const OTHER_MODEL_VALUE = '__other_model__';
/** sentinel สำหรับ "อื่นๆ" ที่รุ่นย่อย (ไม่มีในรายการของรุ่นนั้น) */
export const OTHER_TRIM_VALUE = '__other_trim__';

export type ParsedVehicleModel = {
  /** รุ่นหลักที่เลือก หรือ OTHER_MODEL_VALUE ถ้าไม่ตรงกับรุ่น Toyota ที่มี */
  mainModel: string;
  /** ข้อความที่พิมพ์เองเมื่อ mainModel = OTHER_MODEL_VALUE */
  customModel: string;
  /** รุ่นย่อยที่เลือก, '' = ไม่ระบุ, OTHER_TRIM_VALUE = พิมพ์เอง */
  trim: string;
  /** ข้อความที่พิมพ์เองเมื่อ trim = OTHER_TRIM_VALUE */
  customTrim: string;
};

/** แยกข้อความ label ที่เก็บไว้ (เช่น "Toyota Hiace Standard") กลับเป็นรุ่นหลัก/รุ่นย่อย เพื่อเติมฟอร์มตอนแก้ไข */
export function parseVehicleModelLabel(label: string): ParsedVehicleModel {
  const trimmed = label.trim();
  if (!trimmed) {
    return { mainModel: '', customModel: '', trim: '', customTrim: '' };
  }

  // เรียงยาวไปสั้นกันกรณีชื่อรุ่นหนึ่งเป็นคำนำหน้าของอีกรุ่น (ไม่มีในลิสต์ปัจจุบัน แต่กันไว้)
  const sorted = [...TOYOTA_MODEL_OPTIONS].sort((a, b) => b.length - a.length);
  const matched = sorted.find((opt) => trimmed === opt || trimmed.startsWith(`${opt} `));
  if (!matched) {
    return { mainModel: OTHER_MODEL_VALUE, customModel: trimmed, trim: '', customTrim: '' };
  }

  const remainder = trimmed.slice(matched.length).trim();
  if (!remainder) {
    return { mainModel: matched, customModel: '', trim: '', customTrim: '' };
  }
  const knownTrims = TOYOTA_MODEL_TRIMS[matched] ?? [];
  if (knownTrims.includes(remainder)) {
    return { mainModel: matched, customModel: '', trim: remainder, customTrim: '' };
  }
  return { mainModel: matched, customModel: '', trim: OTHER_TRIM_VALUE, customTrim: remainder };
}

/** ประกอบรุ่นหลัก/รุ่นย่อยกลับเป็นข้อความ label เดียวสำหรับบันทึก */
export function buildVehicleModelLabel(parsed: ParsedVehicleModel): string {
  if (!parsed.mainModel || parsed.mainModel === OTHER_MODEL_VALUE) {
    return parsed.customModel.trim();
  }
  const trimText = parsed.trim === OTHER_TRIM_VALUE ? parsed.customTrim.trim() : parsed.trim;
  return trimText ? `${parsed.mainModel} ${trimText}` : parsed.mainModel;
}

/** แยก label ที่เก็บไว้เป็น "รุ่นรถ" กับ "Model" (รุ่นย่อย/เกรด) สำหรับแสดงเป็น 2 คอลัมน์ในตาราง */
export function describeVehicleModelLabel(label: string | undefined): { model: string; trim: string } {
  const parsed = parseVehicleModelLabel(label ?? '');
  if (!parsed.mainModel || parsed.mainModel === OTHER_MODEL_VALUE) {
    return { model: parsed.customModel || '—', trim: '—' };
  }
  const trimText = parsed.trim === OTHER_TRIM_VALUE ? parsed.customTrim : parsed.trim;
  return { model: parsed.mainModel, trim: trimText || '—' };
}
