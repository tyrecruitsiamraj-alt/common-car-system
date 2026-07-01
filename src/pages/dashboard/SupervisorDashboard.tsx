import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import AppPage from '@/components/layout/AppPage';
import DailyDashboardTab from '@/components/dashboard/DailyDashboardTab';
import PeriodDashboardTab from '@/components/dashboard/PeriodDashboardTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWlEmployees } from '@/hooks/useWlEmployees';
import { apiFetch } from '@/lib/apiFetch';
import { isDemoMode } from '@/lib/demoMode';
import {
  dailyDashboardFetchRange,
  parseDashboardYmd,
  resolveDashboardPeriodRange,
  type DashboardPeriodPreset,
} from '@/lib/fleetDashboardStats';
import type { Vehicle, VehicleBooking } from '@/types';

type DashboardTab = 'daily' | 'period';

const SupervisorDashboard: React.FC = () => {
  const { employees, loading: empLoading } = useWlEmployees();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(!isDemoMode());
  const [bookingsLoading, setBookingsLoading] = useState(!isDemoMode());
  const [activeTab, setActiveTab] = useState<DashboardTab>('daily');

  const [dayYmd, setDayYmd] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [timeFrom, setTimeFrom] = useState('08:00');
  const [timeTo, setTimeTo] = useState('17:00');

  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('this_month');
  const [customFromYmd, setCustomFromYmd] = useState(() => format(new Date(), 'yyyy-MM-01'));
  const [customToYmd, setCustomToYmd] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const periodRange = useMemo(
    () => resolveDashboardPeriodRange(periodPreset, customFromYmd, customToYmd),
    [periodPreset, customFromYmd, customToYmd],
  );

  const fetchRange = useMemo(() => {
    if (activeTab === 'daily') {
      return dailyDashboardFetchRange(parseDashboardYmd(dayYmd));
    }
    return { from: periodRange.from, to: periodRange.to };
  }, [activeTab, dayYmd, periodRange.from, periodRange.to]);

  const fetchRangeKey = `${fetchRange.from.toISOString()}|${fetchRange.to.toISOString()}`;

  useEffect(() => {
    if (isDemoMode()) {
      setVehicles([]);
      setVehiclesLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setVehiclesLoading(true);
      try {
        const rV = await apiFetch('/api/vehicles');
        const rawV = rV.ok ? ((await rV.json()) as unknown) : [];
        if (!cancelled) setVehicles(Array.isArray(rawV) ? rawV : []);
      } catch {
        if (!cancelled) setVehicles([]);
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isDemoMode()) {
      setBookings([]);
      setBookingsLoading(false);
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({
      from: fetchRange.from.toISOString(),
      to: fetchRange.to.toISOString(),
    });
    (async () => {
      setBookingsLoading(true);
      try {
        const rB = await apiFetch(`/api/vehicle-bookings?${q}`);
        const rawB = rB.ok ? ((await rB.json()) as unknown) : [];
        if (!cancelled) setBookings(Array.isArray(rawB) ? rawB : []);
      } catch {
        if (!cancelled) setBookings([]);
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRangeKey]);

  const loading = empLoading || vehiclesLoading || bookingsLoading;

  return (
    <AppPage maxWidth="4xl" panel>
      <PageHeader
        showBrandKicker
        title="Dashboard"
        subtitle="ตรวจสอบการวิ่งงานรายวัน และสรุปภาพรวมรายสัปดาห์/รายเดือน"
        className="mb-6"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="daily" className="text-xs sm:text-sm py-2.5">
            01 รายวัน
          </TabsTrigger>
          <TabsTrigger value="period" className="text-xs sm:text-sm py-2.5">
            02 รายสัปดาห์/เดือน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-0">
          <DailyDashboardTab
            dayYmd={dayYmd}
            onDayChange={setDayYmd}
            timeFrom={timeFrom}
            timeTo={timeTo}
            onTimeFromChange={setTimeFrom}
            onTimeToChange={setTimeTo}
            employees={employees}
            vehicles={vehicles}
            bookings={bookings}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="period" className="mt-0">
          <PeriodDashboardTab
            preset={periodPreset}
            onPresetChange={setPeriodPreset}
            customFromYmd={customFromYmd}
            customToYmd={customToYmd}
            onCustomFromChange={setCustomFromYmd}
            onCustomToChange={setCustomToYmd}
            periodLabel={periodRange.label}
            periodFrom={periodRange.from}
            periodTo={periodRange.to}
            employees={employees}
            vehicles={vehicles}
            bookings={bookings}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </AppPage>
  );
};

export default SupervisorDashboard;
