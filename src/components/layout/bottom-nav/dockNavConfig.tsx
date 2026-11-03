import type { LucideIcon } from 'lucide-react';
import { CalendarPlus, LayoutGrid, Car, Users, BarChart3, AlertTriangle, MessageSquareWarning, ClipboardList } from 'lucide-react';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';

export type DockNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

/** แบบฟอร์มย่อยที่อยู่ใต้ dropdown "แบบฟอร์ม" เมนูซ้าย (ไม่รวมแบบที่แยกเป็นเมนูของตัวเอง) */
export const FORM_GROUP_TYPES = ISSUE_REPORT_TYPES.filter((t) => (t.menuGroup ?? 'forms') === 'forms');

/** แบบฟอร์มที่แยกเป็นปุ่มเมนูซ้ายของตัวเอง เช่น แบบประเมินความพึงพอใจ */
const STANDALONE_TYPES = ISSUE_REPORT_TYPES.filter((t) => t.menuGroup === 'standalone');

/** หมวดหมู่ภาพรวม + แบบฟอร์มย่อย (รถเข้าศูนย์/นายบิน/การลา/ความเร็ว) — แยกออกจาก Complaints เพราะไม่ใช่เรื่องร้องเรียน */
const FORMS_GROUP_PATHS = ['/complaints/overview', '/complaints/history', ...FORM_GROUP_TYPES.map((t) => t.path)];

/** เส้นทางทั้งหมดที่ไม่ถือเป็นหน้า Complaints หลัก (ฟอร์มกลุ่ม + ฟอร์มที่แยกเมนูของตัวเอง) */
const NON_COMPLAINTS_PATHS = [...FORMS_GROUP_PATHS, ...STANDALONE_TYPES.map((t) => t.path)];

function isFormsGroupPath(pathname: string): boolean {
  return FORMS_GROUP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isNonComplaintsPath(pathname: string): boolean {
  return NON_COMPLAINTS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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
  { path: '/complaints/overview', label: 'แบบฟอร์ม', icon: ClipboardList },
  ...STANDALONE_TYPES.map((t) => ({ path: t.path, label: t.label, icon: t.icon })),
];

export function isDockPathActive(path: string, pathname: string): boolean {
  const p = pathname;
  if (path === '/fleet/bookings') return p.startsWith('/fleet/bookings');
  if (path === '/fleet/monitor') return p.startsWith('/fleet/monitor');
  if (path === '/fleet/vehicles') return p.startsWith('/fleet/vehicles');
  if (path === '/fleet/drivers') return p.startsWith('/fleet/drivers');
  if (path === '/dashboard') return p.startsWith('/dashboard');
  if (path === '/accidents') return p.startsWith('/accidents');
  if (path === '/complaints') return p.startsWith('/complaints') && !isNonComplaintsPath(p);
  if (path === '/complaints/overview') return isFormsGroupPath(p);
  const standalone = STANDALONE_TYPES.find((t) => t.path === path);
  if (standalone) return p === path || p.startsWith(`${path}/`);
  return false;
}

export function dockActiveIndex(pathname: string): number {
  const idx = DOCK_NAV_ITEMS.findIndex((item) => isDockPathActive(item.path, pathname));
  return idx;
}
