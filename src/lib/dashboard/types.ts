import type { DashboardPeriodPreset } from '@/lib/fleetDashboardStats';
import type { VehicleBookingCancelReason, VehicleBookingJobType } from '@/types';

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
  | 'in_progress'
  | 'advance'
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
  jobType: VehicleBookingJobType | null;
  cancelReason: VehicleBookingCancelReason | null;
  status: DashboardTaskStatus;
  slaStatus: DashboardSlaStatus;
  createdAt: string;
  updatedAt: string;
  nextAction: string;
  priority: number;
}

export interface DashboardTrendPoint {
  label: string;
  dateLabel: string;
  value: number;
  previousValue?: number;
}

export interface DashboardStatusSlice {
  status: DashboardTaskStatus;
  label: string;
  count: number;
  share: number;
}

export interface DashboardJobTypeTrendPoint {
  label: string;
  dateLabel: string;
  trip_sabuy: number;
  job_order: number;
  substitute: number;
  standby: number;
  unspecified: number;
}

export interface DashboardCancelReasonSlice {
  cancelReason: VehicleBookingCancelReason | 'unspecified';
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

export interface DashboardDriverUtilization {
  /** คนขับ "Common Driver" ทั้งหมด (ไม่รวมพ้นสภาพ) — ไม่นับ Temp/Support/ขับนาย */
  totalDrivers: number;
  /** คนขับ Common Driver ที่มีงาน >= 1 งานในช่วงที่เลือก */
  activeDrivers: number;
  /** activeDrivers / totalDrivers เป็น % ปัดเศษ */
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
  jobTypeTrendSeries: DashboardJobTypeTrendPoint[];
  statusSlices: DashboardStatusSlice[];
  cancelReasonSlices: DashboardCancelReasonSlice[];
  driverSlices: DashboardDriverSlice[];
  driverUtilization: DashboardDriverUtilization;
  periodLabel: string;
  generatedAt: string;
}
