/** ชื่อแอปค่าเริ่มต้น — ตรงกับ DEFAULT_BRANDING ใน src/lib/brandingStorage.ts */
export const DEFAULT_APP_NAME = 'Common Car System';

function isLegacyAppName(name: string): boolean {
  const n = name
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!n) return true;
  if (n === 'jarvis' || n === 'lovable app' || n === 'car stamp') return true;
  if (/so\s*recruit/.test(n)) return true;
  if (/sowork/.test(n.replace(/\s/g, ''))) return true;
  return false;
}

/** ล้างชื่อ/โลโก้แบรนด์เก่า (So Recruit / Jarvis) ก่อนส่งให้ client */
export function normalizeBrandingPayload(p: Record<string, unknown>): Record<string, unknown> {
  const out = { ...p };
  const name = typeof out.appName === 'string' ? out.appName : '';
  if (isLegacyAppName(name)) {
    out.appName = DEFAULT_APP_NAME;
  }
  if (typeof out.logoDataUrl === 'string' && out.logoDataUrl.includes('so-work-logo')) {
    out.logoDataUrl = null;
  }
  return out;
}
