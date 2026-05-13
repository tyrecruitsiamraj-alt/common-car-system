import type { LucideIcon } from 'lucide-react';
import { CalendarPlus, LayoutGrid, Car, Users, BarChart3 } from 'lucide-react';

export type DockNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

/** เมนูหลัก 5 รายการ — ลำดับต้องตรงกับ bottom dock / header */
export const DOCK_NAV_ITEMS: DockNavItem[] = [
  { path: '/fleet/bookings', label: 'จองรถ', icon: CalendarPlus },
  { path: '/fleet/monitor', label: 'ดูภาพรวม', icon: LayoutGrid },
  { path: '/fleet/vehicles', label: 'รายการรถ', icon: Car },
  { path: '/fleet/drivers', label: 'ผู้ขับ', icon: Users },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
];

export function isDockPathActive(path: string, pathname: string): boolean {
  const p = pathname;
  if (path === '/fleet/bookings') return p.startsWith('/fleet/bookings');
  if (path === '/fleet/monitor') return p.startsWith('/fleet/monitor');
  if (path === '/fleet/vehicles') return p.startsWith('/fleet/vehicles');
  if (path === '/fleet/drivers') return p.startsWith('/fleet/drivers');
  if (path === '/dashboard') return p.startsWith('/dashboard');
  return false;
}

export function dockActiveIndex(pathname: string): number {
  const idx = DOCK_NAV_ITEMS.findIndex((item) => isDockPathActive(item.path, pathname));
  return idx;
}
