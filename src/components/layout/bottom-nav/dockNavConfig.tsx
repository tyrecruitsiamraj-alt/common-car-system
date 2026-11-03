import type { LucideIcon } from 'lucide-react';
import { CalendarPlus, LayoutGrid, Car, Users, BarChart3, AlertTriangle, MessageSquareWarning, ClipboardList, FileEdit } from 'lucide-react';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';

export type DockNavSubItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

export type DockNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  /** ถ้ามี — เมนูนี้เป็น dropdown เหมือน "แบบฟอร์ม" (ปุ่มหลักนำทาง, ลูกศรขยายดูเมนูย่อย) */
  subItems?: DockNavSubItem[];
};

/** แบบฟอร์มย่อยที่อยู่ใต้ dropdown "แบบฟอร์ม" เมนูซ้าย (ไม่รวมแบบที่แยกเป็นกลุ่มเมนูของตัวเอง) */
export const FORM_GROUP_TYPES = ISSUE_REPORT_TYPES.filter((t) => (t.menuGroup ?? 'forms') === 'forms');

/** แบบฟอร์มที่แยกเป็นกลุ่มเมนูของตัวเอง พร้อมหน้า Dashboard วิเคราะห์ผล เช่น แบบประเมินความพึงพอใจ */
const STANDALONE_TYPES = ISSUE_REPORT_TYPES.filter((t) => t.menuGroup === 'standalone');

const FORMS_GROUP_ITEM: DockNavItem = {
  path: '/complaints/overview',
  label: 'แบบฟอร์ม',
  icon: ClipboardList,
  subItems: FORM_GROUP_TYPES.map((t) => ({ path: t.path, label: t.label, icon: t.icon })),
};

/** ปุ่มหลักพาไปหน้า Dashboard วิเคราะห์ผล, เมนูย่อยพาไปกรอกแบบฟอร์มเดิม */
const STANDALONE_GROUP_ITEMS: DockNavItem[] = STANDALONE_TYPES.map((t) => ({
  path: `${t.path}/dashboard`,
  label: t.label,
  icon: t.icon,
  subItems: [{ path: t.path, label: 'กรอกแบบฟอร์ม', icon: FileEdit }],
}));

function groupPaths(item: DockNavItem): string[] {
  return [item.path, ...(item.subItems ?? []).map((s) => s.path)];
}

/** เส้นทางทั้งหมดที่ไม่ถือเป็นหน้า Complaints หลัก (ฟอร์มกลุ่ม + กลุ่มเมนูที่แยกของตัวเอง) — แยกออกเพราะไม่ใช่เรื่องร้องเรียน */
const NON_COMPLAINTS_PATHS = ['/complaints/history', ...groupPaths(FORMS_GROUP_ITEM), ...STANDALONE_GROUP_ITEMS.flatMap(groupPaths)];

function matchesAny(paths: string[], pathname: string): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** เมนูหลัก — ลำดับต้องตรงกับ bottom dock / header */
export const DOCK_NAV_ITEMS: DockNavItem[] = [
  { path: '/fleet/bookings', label: 'Bookings', icon: CalendarPlus },
  { path: '/fleet/monitor', label: 'Monitor', icon: LayoutGrid },
  { path: '/fleet/vehicles', label: 'Vehicles', icon: Car },
  { path: '/fleet/drivers', label: 'Drivers', icon: Users },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/accidents', label: 'Accidents', icon: AlertTriangle },
  { path: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  FORMS_GROUP_ITEM,
  ...STANDALONE_GROUP_ITEMS,
];

export function isDockPathActive(path: string, pathname: string): boolean {
  const p = pathname;
  if (path === '/fleet/bookings') return p.startsWith('/fleet/bookings');
  if (path === '/fleet/monitor') return p.startsWith('/fleet/monitor');
  if (path === '/fleet/vehicles') return p.startsWith('/fleet/vehicles');
  if (path === '/fleet/drivers') return p.startsWith('/fleet/drivers');
  if (path === '/dashboard') return p.startsWith('/dashboard');
  if (path === '/accidents') return p.startsWith('/accidents');
  if (path === '/complaints') return p.startsWith('/complaints') && !matchesAny(NON_COMPLAINTS_PATHS, p);
  if (path === '/complaints/overview') return matchesAny(groupPaths(FORMS_GROUP_ITEM), p);
  const standalone = STANDALONE_GROUP_ITEMS.find((g) => g.path === path);
  if (standalone) return matchesAny(groupPaths(standalone), p);
  return false;
}

export function dockActiveIndex(pathname: string): number {
  const idx = DOCK_NAV_ITEMS.findIndex((item) => isDockPathActive(item.path, pathname));
  return idx;
}
