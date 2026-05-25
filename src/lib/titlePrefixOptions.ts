export const TITLE_PREFIX_OPTIONS = [
  { value: '', label: '— ไม่มี —' },
  { value: 'นาย', label: 'นาย' },
  { value: 'นาง', label: 'นาง' },
  { value: 'นางสาว', label: 'นางสาว' },
  { value: 'เด็กชาย', label: 'เด็กชาย' },
  { value: 'เด็กหญิง', label: 'เด็กหญิง' },
] as const;

export function normalizeTitlePrefix(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return TITLE_PREFIX_OPTIONS.some((opt) => opt.value === trimmed) ? trimmed : '';
}

export function formatEmployeeDisplayName(
  e: { title_prefix?: string | null; first_name: string; last_name: string },
): string {
  const p = (e.title_prefix ?? '').trim();
  const f = (e.first_name ?? '').trim();
  const l = (e.last_name ?? '').trim();
  return [p, f, l].filter(Boolean).join(' ');
}

