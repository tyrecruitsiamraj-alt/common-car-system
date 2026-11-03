import type { LucideIcon } from 'lucide-react';
import { CalendarPlus, LayoutGrid, Car, Users, BarChart3, AlertTriangle, MessageSquareWarning, ClipboardList } from 'lucide-react';
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

/** แบบฟอร์มย่อยที่อยู่ใต้ dropdown "แบบฟอร์ม" เมนูซ้าย (ไม่รวมแบบที่แยกเป็นเมนูของตัวเอง) */
export const FORM_GROUP_TYPES = ISSUE_REPORT_TYPES.filter((t) => (t.menuGroup ?? 'forms') === 'forms');

/** แบบฟอร์มที่แยกเป็นปุ่มเมนูซ้ายของตัวเอง เช่น แบบประเมินความพึงพอใจ — กดแล้วไปกรอกแบบฟอร์มทันที
 *  (หน้า Dashboard วิเคราะห์ผลของฟอร์มเหล่านี้ไม่ได้อยู่ใน DOCK_NAV_ITEMS — มีสิทธิ์เข้าถึงจำกัด
 *  จึงแสดงเป็นเมนูแยกต่างหากใน AppLayout เองแบบเดียวกับ "ชั่วโมงทำงาน") */
const STANDALONE_TYPES = ISSUE_REPORT_TYPES.filter((t) => t.menuGroup === 'standalone');

const FORMS_GROUP_ITEM: DockNavItem = {
  path: '/complaints/overview',
  label: 'แบบฟอร์ม',
  icon: ClipboardList,
  subItems: FORM_GROUP_TYPES.map((t) => ({ path: t.path, label: t.label, icon: t.icon })),
};

const STANDALONE_ITEMS: DockNavItem[] = STANDALONE_TYPES.map((t) => ({ path: t.path, label: t.label, icon: t.icon }));

function groupPaths(item: DockNavItem): string[] {
  return [item.path, ...(item.subItems ?? []).map((s) => s.path)];
}

/** path หน้า Dashboard ของฟอร์มที่แยกเมนู — กันไม่ให้ "Complaints" ไฮไลต์ผิดตอนเปิดหน้านี้ (สิทธิ์จำกัด จึงไม่อยู่ใน DOCK_NAV_ITEMS) */
const STANDALONE_DASHBOARD_PATHS = STANDALONE_TYPES.map((t) => `${t.path}/dashboard`);

/** เส้นทางทั้งหมดที่ไม่ถือเป็นหน้า Complaints หลัก — แยกออกเพราะไม่ใช่เรื่องร้องเรียน */
const NON_COMPLAINTS_PATHS = [
  '/complaints/history',
  ...groupPaths(FORMS_GROUP_ITEM),
  ...STANDALONE_ITEMS.map((i) => i.path),
  ...STANDALONE_DASHBOARD_PATHS,
];

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
  ...STANDALONE_ITEMS,
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
  if (STANDALONE_ITEMS.some((i) => i.path === path)) return p === path;
  return false;
}

export function dockActiveIndex(pathname: string): number {
  const idx = DOCK_NAV_ITEMS.findIndex((item) => isDockPathActive(item.path, pathname));
  return idx;
}
