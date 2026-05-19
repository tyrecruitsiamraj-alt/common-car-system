import type { CSSProperties } from 'react';

/** HSL components as in shadcn: "H S% L%" (no hsl() wrapper) */
export type BrandingConfig = {
  appName: string;
  logoDataUrl: string | null;
  /** Main brand color → primary, accent, ring, sidebar-primary */
  primaryHsl: string;
  backgroundHsl: string;
  foregroundHsl: string;
  cardHsl: string;
  pageBackgroundMode: 'solid' | 'gradient';
  /** Gradient endpoints (HSL components), used when pageBackgroundMode === 'gradient' */
  gradientFromHsl: string;
  gradientToHsl: string;
};

/** พื้นหลังแบบ Fleet Bookings mockup */
export const FLEET_APP_SHELL_GRADIENT =
  'radial-gradient(circle at top left, #dbeafe, transparent 32%), linear-gradient(135deg, #f8fafc, #eef2ff 45%, #f8fafc)';

const LEGACY_RED_PRIMARY = '0 72% 50%';

/** localStorage — เปลี่ยนคีย์เมื่อ rebrand เพื่อตัดชื่อ So Recruit ที่ค้างจากเวอร์ชันเก่า */
const KEY = 'common_car_branding_v1';
const LEGACY_KEYS = ['so_recruit_branding_v1', 'jarvis_branding_v1'] as const;

export const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'Common Car System',
  logoDataUrl: null,
  primaryHsl: '222 47% 11%',
  backgroundHsl: '210 40% 98%',
  foregroundHsl: '222 47% 11%',
  cardHsl: '0 0% 100%',
  pageBackgroundMode: 'gradient',
  gradientFromHsl: '210 40% 98%',
  gradientToHsl: '226 57% 96%',
};

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

/** ย้ายจากธีมแดงเก่า → slate/blue ใหม่ */
export function migrateBrandingTheme(c: BrandingConfig): BrandingConfig {
  if (c.primaryHsl.trim() !== LEGACY_RED_PRIMARY) return c;
  return {
    ...c,
    primaryHsl: DEFAULT_BRANDING.primaryHsl,
    backgroundHsl: DEFAULT_BRANDING.backgroundHsl,
    foregroundHsl: DEFAULT_BRANDING.foregroundHsl,
    pageBackgroundMode: 'gradient',
    gradientFromHsl: DEFAULT_BRANDING.gradientFromHsl,
    gradientToHsl: DEFAULT_BRANDING.gradientToHsl,
  };
}

/** ล้างชื่อ/โลโก้แบรนด์เก่า (So Recruit, SOWORK, Jarvis) — ใช้ทั้ง client และให้สอดคล้องกับ API */
export function normalizeBrandingConfig(merged: BrandingConfig): BrandingConfig {
  const out = migrateBrandingTheme({ ...merged });
  if (isLegacyAppName(out.appName || '')) {
    out.appName = DEFAULT_BRANDING.appName;
  }
  if (typeof out.logoDataUrl === 'string' && out.logoDataUrl.includes('so-work-logo')) {
    out.logoDataUrl = null;
  }
  if (!out.logoDataUrl || !String(out.logoDataUrl).trim()) {
    out.logoDataUrl = null;
  }
  return out;
}

export function loadBranding(): BrandingConfig {
  if (typeof window === 'undefined') return DEFAULT_BRANDING;
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      for (const k of LEGACY_KEYS) {
        raw = localStorage.getItem(k);
        if (raw) break;
      }
    }
    if (!raw) return DEFAULT_BRANDING;
    const p = JSON.parse(raw) as Partial<BrandingConfig>;
    const merged = { ...DEFAULT_BRANDING, ...p };
    const result = normalizeBrandingConfig(merged);
    try {
      localStorage.setItem(KEY, JSON.stringify(result));
      for (const k of LEGACY_KEYS) {
        localStorage.removeItem(k);
      }
    } catch {
      /* quota */
    }
    return result;
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function saveBranding(c: BrandingConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
    for (const k of LEGACY_KEYS) {
      localStorage.removeItem(k);
    }
  } catch {
    /* quota */
  }
}

/** #rrggbb → "H S% L%" */
export function hexToHslComponents(hex: string): string {
  const h = hex.replace(/^#/, '');
  if (h.length !== 6) return DEFAULT_BRANDING.primaryHsl;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  const l = (max + min) / 2;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      default:
        hue = ((r - g) / d + 4) / 6;
    }
  }

  const H = Math.round(hue * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);
  return `${H} ${S}% ${L}%`;
}

export function hslComponentsToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return '#0f172a';
  const h = Number(parts[0]) / 360;
  const s = Number(parts[1].replace('%', '')) / 100;
  const l = Number(parts[2].replace('%', '')) / 100;
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return '#0f172a';

  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function applyBrandingToDocument(c: BrandingConfig): void {
  if (typeof document === 'undefined') return;
  const name = (c.appName || DEFAULT_BRANDING.appName).trim() || DEFAULT_BRANDING.appName;
  document.title = name;

  const root = document.documentElement;

  root.style.setProperty('--primary', c.primaryHsl);
  root.style.setProperty('--primary-foreground', '0 0% 100%');
  root.style.setProperty('--ring', '217 91% 60%');
  root.style.setProperty('--sidebar-primary', c.primaryHsl);
  root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
  root.style.setProperty('--sidebar-ring', '217 91% 60%');

  const pp = c.primaryHsl.trim().split(/\s+/);
  const ph = pp[0] ?? '222';
  const ps = pp[1] ?? '47%';
  const plRaw = pp[2] ?? '11%';
  const lNum = parseInt(plRaw.replace('%', ''), 10);
  const darkerL = Math.max(0, lNum + 8);
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, hsl(${c.primaryHsl}), hsl(${ph} ${ps} ${darkerL}%))`,
  );

  root.style.setProperty('--background', c.backgroundHsl);
  root.style.setProperty('--foreground', c.foregroundHsl);
  root.style.setProperty('--card', c.cardHsl);
  root.style.setProperty('--card-foreground', c.foregroundHsl);
  root.style.setProperty('--popover', c.cardHsl);
  root.style.setProperty('--popover-foreground', c.foregroundHsl);

  root.style.setProperty('--gradient-card', `linear-gradient(145deg, hsl(${c.cardHsl} / 0.92), hsl(${c.backgroundHsl} / 0.88))`);

  if (c.pageBackgroundMode === 'gradient') {
    root.setAttribute('data-page-bg', 'gradient');
    root.style.setProperty('--gradient-hero', FLEET_APP_SHELL_GRADIENT);
    root.style.setProperty('--app-shell-gradient', FLEET_APP_SHELL_GRADIENT);
  } else {
    root.removeAttribute('data-page-bg');
    const solid = `linear-gradient(135deg, hsl(${c.backgroundHsl}), hsl(${c.backgroundHsl}))`;
    root.style.setProperty('--gradient-hero', solid);
    root.style.setProperty('--app-shell-gradient', solid);
  }
}

/** พื้นหลังแบบ gradient สำหรับ wrapper หลัก (AppLayout / Login) */
export function getAppShellBackgroundStyle(c: BrandingConfig): CSSProperties | undefined {
  if (c.pageBackgroundMode !== 'gradient') return undefined;
  return {
    background: FLEET_APP_SHELL_GRADIENT,
    backgroundAttachment: 'fixed',
    minHeight: '100dvh',
  };
}
