import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import DashboardShell from '@/components/dashboard/analytics/DashboardShell';
import { buildDashboardData, bookingToWorkItem } from '@/lib/dashboard/buildDashboardData';
import { exportWorkQueueCsv } from '@/lib/dashboard/exportWorkQueue';
import { MOCK_DASHBOARD_DATA } from '@/lib/dashboard/mockDashboardData';
import type { DashboardFilters } from '@/lib/dashboard/types';
import { useWlEmployees } from '@/hooks/useWlEmployees';
import { apiFetch } from '@/lib/apiFetch';
import { isDemoMode } from '@/lib/demoMode';
import { resolveDashboardPeriodRange } from '@/lib/fleetDashboardStats';
import type { Vehicle, VehicleBooking } from '@/types';

const SupervisorDashboard: React.FC = () => {
  const { employees, loading: empLoading } = useWlEmployees();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [fleetLoading, setFleetLoading] = useState(!isDemoMode());
  const [refreshKey, setRefreshKey] = useState(0);

  const [filters, setFilters] = useState<DashboardFilters>(() => ({
    status: 'all',
    ownerId: '',
    vehicleId: '',
    periodPreset: 'this_month',
    customFromYmd: format(new Date(), 'yyyy-MM-01'),
    customToYmd: format(new Date(), 'yyyy-MM-dd'),
    search: '',
  }));

  const periodRange = useMemo(
    () => resolveDashboardPeriodRange(filters.periodPreset, filters.customFromYmd, filters.customToYmd),
    [filters.periodPreset, filters.customFromYmd, filters.customToYmd],
  );

  const fetchFrom = periodRange.from;
  const fetchTo = periodRange.to;
  const fetchKey = `${fetchFrom.toISOString()}|${fetchTo.toISOString()}|${refreshKey}`;

  useEffect(() => {
    if (isDemoMode()) {
      setVehicles([]);
      setBookings([]);
      setFleetLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setFleetLoading(true);
      try {
        const [rV, rB] = await Promise.all([
          apiFetch('/api/vehicles'),
          apiFetch(
            `/api/vehicle-bookings?${new URLSearchParams({
              from: fetchFrom.toISOString(),
              to: fetchTo.toISOString(),
            })}`,
          ),
        ]);
        const rawV = rV.ok ? ((await rV.json()) as unknown) : [];
        const rawB = rB.ok ? ((await rB.json()) as unknown) : [];
        if (!cancelled) {
          setVehicles(Array.isArray(rawV) ? rawV : []);
          setBookings(Array.isArray(rawB) ? rawB : []);
        }
      } catch {
        if (!cancelled) {
          setVehicles([]);
          setBookings([]);
        }
      } finally {
        if (!cancelled) setFleetLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchKey, fetchFrom, fetchTo]);

  const loading = empLoading || fleetLoading;

  const dashboardData = useMemo(() => {
    if (isDemoMode() && bookings.length === 0) {
      return { ...MOCK_DASHBOARD_DATA, periodLabel: periodRange.label };
    }
    return buildDashboardData(bookings, employees, vehicles, periodRange, filters);
  }, [bookings, employees, vehicles, periodRange, filters]);

  const onFiltersChange = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  /** Export ทั้งหมดที่ตรงตัวกรอง (ไม่ใช่แค่หน้าที่กำลังแสดง) — ดึงตรงจาก server แบบ limit สูง */
  const onExport = useCallback(async () => {
    const params = new URLSearchParams({
      report: 'work_queue',
      from: periodRange.from.toISOString(),
      to: periodRange.to.toISOString(),
      limit: '2000',
      offset: '0',
    });
    if (filters.ownerId) params.set('ownerId', filters.ownerId);
    if (filters.vehicleId) params.set('vehicleId', filters.vehicleId);
    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    try {
      const r = await apiFetch(`/api/dashboard-reports?${params.toString()}`);
      const data = r.ok ? ((await r.json()) as unknown) : [];
      const bookingRows = Array.isArray(data) ? (data as VehicleBooking[]) : [];
      exportWorkQueueCsv(bookingRows.map((b) => bookingToWorkItem(b, employees, vehicles)));
    } catch {
      exportWorkQueueCsv([]);
    }
  }, [periodRange, filters, employees, vehicles]);

  return (
    <DashboardShell
      data={dashboardData}
      filters={filters}
      onFiltersChange={onFiltersChange}
      employees={employees}
      vehicles={vehicles}
      fromIso={periodRange.from.toISOString()}
      toIso={periodRange.to.toISOString()}
      loading={loading}
      onRefresh={onRefresh}
      onExport={onExport}
    />
  );
};

export default SupervisorDashboard;
