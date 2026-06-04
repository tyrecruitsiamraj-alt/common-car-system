/** คั่นหลายปลายทางเมื่อบันทึกในคอลัมน์ destination เดียว */
export const DESTINATION_JOINER = ' → ';

export function normalizeDestinationPart(part: string): string {
  return part.trim().replace(/\s+/g, ' ');
}

/** แยกข้อความปลายทางเดิม (รองรับ → | , ขึ้นบรรทัด) */
export function splitDestinations(raw: string): string[] {
  const t = (raw ?? '').trim();
  if (!t) return [''];
  const parts = t
    .split(/\s*→\s*|\s*\|\s*|\s*,\s*|\r?\n+/)
    .map(normalizeDestinationPart)
    .filter(Boolean);
  return parts.length > 0 ? parts : [''];
}

export function joinDestinations(parts: string[]): string {
  return parts.map(normalizeDestinationPart).filter(Boolean).join(DESTINATION_JOINER);
}

export function addDestinationSuggestionsFromJoined(raw: string, addOne: (dest: string) => void): void {
  for (const part of splitDestinations(raw)) {
    const n = normalizeDestinationPart(part);
    if (n) addOne(n);
  }
}
