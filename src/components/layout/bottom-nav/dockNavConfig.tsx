import type { LucideIcon } from 'lucide-react';
import { CalendarPlus, LayoutGrid, Car, Users, BarChart3, AlertTriangle } from 'lucide-react';

export type DockNavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

/** เมนูหลัก — ลำดับต้องตรงกับ bottom dock / header */
export const DOCK_NAV_ITEMS: DockNavItem[] = [
  { path: '/fleet/bookings', label: 'Bookings', icon: CalendarPlus },
  { path: '/fleet/monitor', label: 'Monitor', icon: LayoutGrid },
  { path: '/fleet/vehicles', label: 'Vehicles', icon: Car },
  { path: '/fleet/drivers', label: 'Drivers', icon: Users },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/accidents', label: 'Accidents', icon: AlertTriangle },
];

export function isDockPathActive(path: string, pathname: string): boolean {
  const p = pathname;
  if (path === '/fleet/bookings') return p.startsWith('/fleet/bookings');
  if (path === '/fleet/monitor') return p.startsWith('/fleet/monitor');
  if (path === '/fleet/vehicles') return p.startsWith('/fleet/vehicles');
  if (path === '/fleet/drivers') return p.startsWith('/fleet/drivers');
  if (path === '/dashboard') return p.startsWith('/dashboard');
  if (path === '/accidents') return p.startsWith('/accidents');
  return false;
}

export function dockActiveIndex(pathname: string): number {
  const idx = DOCK_NAV_ITEMS.findIndex((item) => isDockPathActive(item.path, pathname));
  return idx;
}
