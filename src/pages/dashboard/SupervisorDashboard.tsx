import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import DashboardShell from '@/components/dashboard/analytics/DashboardShell';
import { buildDashboardData, applyDashboardFilters } from '@/lib/dashboard/buildDashboardData';
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
      const workQueue = applyDashboardFilters(MOCK_DASHBOARD_DATA.workQueue, filters);
      return { ...MOCK_DASHBOARD_DATA, workQueue, periodLabel: periodRange.label };
    }
    return buildDashboardData(bookings, employees, vehicles, periodRange, filters);
  }, [bookings, employees, vehicles, periodRange, filters]);

  const onFiltersChange = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const onExport = useCallback(() => {
    exportWorkQueueCsv(dashboardData.workQueue);
  }, [dashboardData.workQueue]);

  return (
    <DashboardShell
      data={dashboardData}
      filters={filters}
      onFiltersChange={onFiltersChange}
      employees={employees}
      vehicles={vehicles}
      loading={loading}
      onRefresh={onRefresh}
      onExport={onExport}
    />
  );
};

export default SupervisorDashboard;
