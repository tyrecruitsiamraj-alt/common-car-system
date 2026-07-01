import React, { useMemo, useState } from 'react';
import { Ban, CalendarDays, Car, Clock, Users } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import DashboardPeriodPicker from '@/components/dashboard/DashboardPeriodPicker';
import DashboardRankList from '@/components/dashboard/DashboardRankList';
import {
  bookingsInRange,
  computePeriodKpis,
  topByKey,
  type DashboardPeriodPreset,
} from '@/lib/fleetDashboardStats';
import type { Employee, Vehicle, VehicleBooking } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type SortMode = 'count' | 'hours';

type Props = {
  preset: DashboardPeriodPreset;
  onPresetChange: (preset: DashboardPeriodPreset) => void;
  customFromYmd: string;
  customToYmd: string;
  onCustomFromChange: (ymd: string) => void;
  onCustomToChange: (ymd: string) => void;
  periodLabel: string;
  periodFrom: Date;
  periodTo: Date;
  employees: Employee[];
  vehicles: Vehicle[];
  bookings: VehicleBooking[];
  loading?: boolean;
};

const PeriodDashboardTab: React.FC<Props> = ({
  preset,
  onPresetChange,
  customFromYmd,
  customToYmd,
  onCustomFromChange,
  onCustomToChange,
  periodLabel,
  periodFrom,
  periodTo,
  employees,
  vehicles,
  bookings,
  loading,
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('count');

  const periodBookings = useMemo(
    () => bookingsInRange(bookings, periodFrom, periodTo),
    [bookings, periodFrom, periodTo],
  );

  const kpis = useMemo(() => computePeriodKpis(periodBookings), [periodBookings]);

  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const vehById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const empLabel = (id: string) => {
    const e = empById.get(id);
    return e ? `${e.first_name} ${e.last_name}`.trim() || e.employee_code : id.slice(0, 8);
  };
  const plateLabel = (id: string) => vehById.get(id)?.plate_no?.trim() || id.slice(0, 8);

  const topEmployees = useMemo(() => {
    const items = topByKey(periodBookings, 'employee_id', 10, empLabel, { includeHours: true });
    if (sortMode === 'hours') {
      return [...items].sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0));
    }
    return items;
  }, [periodBookings, empById, sortMode]);

  const topVehicles = useMemo(
    () => topByKey(periodBookings, 'vehicle_id', 10, plateLabel),
    [periodBookings, vehById],
  );

  const activePeople = useMemo(
    () => employees.filter((e) => e.status === 'active').length,
    [employees],
  );
  const vehicleCount = useMemo(() => vehicles.filter((v) => v.is_active !== false).length, [vehicles]);

  return (
    <div className="space-y-4">
      <DashboardPeriodPicker
        preset={preset}
        onPresetChange={onPresetChange}
        customFromYmd={customFromYmd}
        customToYmd={customToYmd}
        onCustomFromChange={onCustomFromChange}
        onCustomToChange={onCustomToChange}
        periodLabel={periodLabel}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="จำนวน Booking"
          value={loading ? '…' : kpis.totalBookings}
          subtitle={`ใช้งาน ${kpis.activeBookings} · ยกเลิก ${kpis.cancelled}`}
          icon={CalendarDays}
          variant="primary"
        />
        <StatCard
          title="งานที่ถูกยกเลิก"
          value={loading ? '…' : kpis.cancelled}
          subtitle={periodLabel}
          icon={Ban}
          variant={kpis.cancelled > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          title="ชั่วโมง Driver รวม"
          value={loading ? '…' : kpis.totalDriverHours.toLocaleString('th-TH')}
          subtitle="ชม. (ไม่รวมงานยกเลิก)"
          icon={Clock}
          variant="info"
        />
      </div>

      <div className="glass-card rounded-3xl p-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล…</p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            รถที่เปิดใช้งาน <strong className="text-foreground">{vehicleCount}</strong> คัน · ผู้ขับ active{' '}
            <strong className="text-foreground">{activePeople}</strong> คน · ช่วงที่เลือกมีการจอง{' '}
            <strong className="text-foreground">{kpis.totalBookings}</strong> ครั้ง
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">อันดับปริมาณงานต่อคน</p>
        <div className="space-y-1.5 min-w-[10rem]">
          <Label className="text-xs text-muted-foreground">เรียงลำดับ</Label>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">จำนวนครั้ง (มาก → น้อย)</SelectItem>
              <SelectItem value="hours">ชั่วโมงรวม (มาก → น้อย)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardRankList
          title="ปริมาณงานต่อคน"
          subtitle={periodLabel}
          icon={Users}
          items={topEmployees}
          loading={loading}
          emptyText="ยังไม่มีการจองในช่วงนี้"
          showHours
        />
        <DashboardRankList
          title="รถที่ถูกใช้มากที่สุด"
          subtitle={periodLabel}
          icon={Car}
          items={topVehicles}
          loading={loading}
          emptyText="ยังไม่มีการจองในช่วงนี้"
        />
      </div>
    </div>
  );
};

export default PeriodDashboardTab;
