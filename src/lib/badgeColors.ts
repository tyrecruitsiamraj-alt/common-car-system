/**
 * สีประจำค่าหนึ่งๆ (เช่น ชื่อรุ่นรถ, ชื่อศูนย์, ประเภทการเข้าศูนย์) แบบคงที่ —
 * ค่าเดียวกันได้สีเดียวกันเสมอทั่วทั้งแอป เพื่อให้แยกประเภทด้วยสีได้ทันทีโดยไม่ต้องกำหนดสีราย field เอง
 */
export type BadgeColor = { bg: string; text: string; solid: string };

const PALETTE: BadgeColor[] = [
  { bg: '#dbeafe', text: '#1d4ed8', solid: '#3b82f6' }, // blue
  { bg: '#fef3c7', text: '#b45309', solid: '#f59e0b' }, // amber
  { bg: '#dcfce7', text: '#15803d', solid: '#22c55e' }, // emerald
  { bg: '#fee2e2', text: '#b91c1c', solid: '#ef4444' }, // rose
  { bg: '#ede9fe', text: '#6d28d9', solid: '#8b5cf6' }, // violet
  { bg: '#cffafe', text: '#0e7490', solid: '#06b6d4' }, // cyan
  { bg: '#ffedd5', text: '#c2410c', solid: '#f97316' }, // orange
  { bg: '#ecfccb', text: '#4d7c0f', solid: '#84cc16' }, // lime
  { bg: '#fce7f3', text: '#be185d', solid: '#ec4899' }, // pink
  { bg: '#e0e7ff', text: '#4338ca', solid: '#6366f1' }, // indigo
];

const FALLBACK: BadgeColor = { bg: '#f1f5f9', text: '#475569', solid: '#94a3b8' };

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getBadgeColor(value: string | undefined | null): BadgeColor {
  const trimmed = value?.trim();
  if (!trimmed) return FALLBACK;
  return PALETTE[hashString(trimmed) % PALETTE.length];
}
