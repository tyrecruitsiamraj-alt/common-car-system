import type { LucideIcon } from 'lucide-react';
import { CalendarPlus, LayoutGrid, Car, Users, BarChart3, AlertTriangle, MessageSquareWarning, ClipboardList } from 'lucide-react';
import { ISSUE_REPORT_TYPES } from '@/lib/issueReportConfig';

export type DockNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

/** หมวดหมู่ภาพรวม + แบบฟอร์มย่อย (รถเข้าศูนย์/นายบิน/การลา/ความเร็ว) — แยกออกจาก Complaints เพราะไม่ใช่เรื่องร้องเรียน */
const FORMS_GROUP_PATHS = ['/complaints/overview', '/complaints/history', ...ISSUE_REPORT_TYPES.map((t) => t.path)];

function isFormsGroupPath(pathname: string): boolean {
  return FORMS_GROUP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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
];

export function isDockPathActive(path: string, pathname: string): boolean {
  const p = pathname;
  if (path === '/fleet/bookings') return p.startsWith('/fleet/bookings');
  if (path === '/fleet/monitor') return p.startsWith('/fleet/monitor');
  if (path === '/fleet/vehicles') return p.startsWith('/fleet/vehicles');
  if (path === '/fleet/drivers') return p.startsWith('/fleet/drivers');
  if (path === '/dashboard') return p.startsWith('/dashboard');
  if (path === '/accidents') return p.startsWith('/accidents');
  if (path === '/complaints') return p.startsWith('/complaints') && !isFormsGroupPath(p);
  if (path === '/complaints/overview') return isFormsGroupPath(p);
  return false;
}

export function dockActiveIndex(pathname: string): number {
  const idx = DOCK_NAV_ITEMS.findIndex((item) => isDockPathActive(item.path, pathname));
  return idx;
}
