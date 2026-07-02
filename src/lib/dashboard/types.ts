import type { DashboardPeriodPreset } from '@/lib/fleetDashboardStats';

export type DashboardTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled'
  | 'at_risk';

export type DashboardSlaStatus = 'on_track' | 'at_risk' | 'breached';

export type DashboardTrendDirection = 'up' | 'down' | 'neutral';

export type DashboardKpiId =
  | 'total'
  | 'pending'
  | 'overdue'
  | 'completed'
  | 'success_rate';

export interface DashboardTrend {
  value: number;
  label: string;
  direction: DashboardTrendDirection;
}

export interface DashboardKpi {
  id: DashboardKpiId;
  label: string;
  value: string;
  hint: string;
  trend?: DashboardTrend;
}

export interface DashboardWorkItem {
  id: string;
  workOrderNo: string;
  title: string;
  ownerId: string;
  ownerName: string;
  vehiclePlate: string;
  vehicleLabel: string;
  department: string;
  site: string;
  status: DashboardTaskStatus;
  slaStatus: DashboardSlaStatus;
  createdAt: string;
  updatedAt: string;
  nextAction: string;
  priority: number;
}

export interface DashboardTrendPoint {
  label: string;
  value: number;
  previousValue?: number;
}

export interface DashboardStatusSlice {
  status: DashboardTaskStatus;
  label: string;
  count: number;
  share: number;
}

export interface DashboardDriverSlice {
  id: string;
  name: string;
  subtitle: string;
  taskCount: number;
  completedCount: number;
  overdueCount: number;
  share: number;
}

export interface DashboardFilters {
  status: 'all' | DashboardTaskStatus;
  ownerId: string;
  vehicleId: string;
  periodPreset: DashboardPeriodPreset;
  customFromYmd: string;
  customToYmd: string;
  search: string;
}

export interface DashboardData {
  kpis: DashboardKpi[];
  trendSeries: DashboardTrendPoint[];
  statusSlices: DashboardStatusSlice[];
  driverSlices: DashboardDriverSlice[];
  workQueue: DashboardWorkItem[];
  periodLabel: string;
  generatedAt: string;
}

export type DashboardSortKey =
  | 'priority'
  | 'updatedAt'
  | 'createdAt'
  | 'ownerName'
  | 'status';

export type DashboardSortDir = 'asc' | 'desc';
