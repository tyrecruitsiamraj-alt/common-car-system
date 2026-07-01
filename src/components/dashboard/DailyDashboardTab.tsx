import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { addHours } from 'date-fns';
import { Ban, CalendarDays, Car, Clock3, ExternalLink, Users } from 'lucide-react';
import DateSelectDmyBe from '@/components/shared/DateSelectDmyBe';
import { TimeHm24Select } from '@/components/shared/TimeHm24Select';
import StatCard from '@/components/shared/StatCard';
import { Label } from '@/components/ui/label';
import DashboardHourlyGrid from '@/components/dashboard/DashboardHourlyGrid';
import {
  combineYmdHm,
  computeDailyEmployeeSummary,
  computeTodaySummaryCounts,
  formatDashboardDayLabel,
  parseDashboardYmd,
} from '@/lib/fleetDashboardStats';
import { computeBookingAvailability } from '@/lib/bookingAvailability';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

type Props = {
  dayYmd: string;
  onDayChange: (ymd: string) => void;
  timeFrom: string;
  timeTo: string;
  onTimeFromChange: (hm: string) => void;
  onTimeToChange: (hm: string) => void;
  employees: Employee[];
  vehicles: Vehicle[];
  bookings: VehicleBooking[];
  loading?: boolean;
};

const DailyDashboardTab: React.FC<Props> = ({
  dayYmd,
  onDayChange,
  timeFrom,
  timeTo,
  onTimeFromChange,
  onTimeToChange,
  employees,
  vehicles,
  bookings,
  loading,
}) => {
  const day = useMemo(() => parseDashboardYmd(dayYmd), [dayYmd]);
  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active'), [employees]);
  const activeVehicles = useMemo(() => vehicles.filter((v) => v.is_active !== false), [vehicles]);
  const vehMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const windowFrom = useMemo(() => combineYmdHm(dayYmd, timeFrom), [dayYmd, timeFrom]);
  const windowTo = useMemo(() => {
    const to = combineYmdHm(dayYmd, timeTo);
    return to > windowFrom ? to : addHours(windowFrom, 1);
  }, [dayYmd, timeTo, windowFrom]);

  const availability = useMemo(
    () => computeBookingAvailability(windowFrom, windowTo, bookings, employees, vehicles),
    [windowFrom, windowTo, bookings, employees, vehicles],
  );

  const daySummary = useMemo(
    () => computeDailyEmployeeSummary(bookings, employees, day),
    [bookings, employees, day],
  );

  const todayCounts = useMemo(() => computeTodaySummaryCounts(bookings, day), [bookings, day]);

  const dayLabel = formatDashboardDayLabel(day);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">วันที่</Label>
            <DateSelectDmyBe value={dayYmd} onChange={onDayChange} yearKind="ce" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ตั้งแต่</Label>
            <TimeHm24Select value={timeFrom} onChange={onTimeFromChange} minuteStep={30} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ถึง</Label>
            <TimeHm24Select value={timeTo} onChange={onTimeToChange} minuteStep={30} minHm={timeFrom} />
          </div>
          <Link
            to="/fleet/monitor"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline sm:ml-auto pb-1"
          >
            เปิด Monitor เพื่อจอง
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          ตรวจสอบความว่างของพนักงานและรถในช่วงเวลาที่เลือก — {dayLabel}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="คนว่าง (ช่วงที่เลือก)"
          value={loading ? '…' : availability.availableEmployees.length}
          subtitle={`จาก ${activeEmployees.length} คน active`}
          icon={Users}
          variant="success"
        />
        <StatCard
          title="รถว่าง (ช่วงที่เลือก)"
          value={loading ? '…' : availability.availableVehicles.length}
          subtitle={`จาก ${activeVehicles.length} คัน`}
          icon={Car}
          variant="primary"
        />
        <StatCard
          title="กำลังดำเนินการ"
          value={loading ? '…' : todayCounts.inProgress}
          subtitle={`${dayLabel}`}
          icon={Clock3}
          variant="info"
        />
        <StatCard
          title="ยกเลิก"
          value={loading ? '…' : todayCounts.cancelled}
          subtitle={`${dayLabel}`}
          icon={Ban}
          variant={todayCounts.cancelled > 0 ? 'destructive' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-foreground">
              คนว่างในช่วง {timeFrom} – {timeTo}
            </p>
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground">กำลังโหลด…</p>
          ) : availability.availableEmployees.length === 0 ? (
            <p className="text-xs text-muted-foreground">ไม่มีพนักงานว่างในช่วงเวลานี้</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
              {availability.availableEmployees.map((e) => (
                <span
                  key={e.id}
                  className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 border border-emerald-600/25"
                >
                  {e.first_name} {e.last_name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-semibold text-foreground">สรุปพนักงาน {dayLabel}</p>
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground">กำลังโหลด…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                <p className="text-muted-foreground">ทั้งหมด</p>
                <p className="text-lg font-bold tabular-nums">{daySummary.stats.total}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                <p className="text-muted-foreground">ว่างทั้งวัน</p>
                <p className="text-lg font-bold tabular-nums text-emerald-700">{daySummary.stats.freeAllDay}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                <p className="text-muted-foreground">กำลังใช้งาน</p>
                <p className="text-lg font-bold tabular-nums">{daySummary.stats.inUse}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
                <p className="text-muted-foreground">ว่างบางช่วง</p>
                <p className="text-lg font-bold tabular-nums">{daySummary.stats.partialFree}</p>
              </div>
            </div>
          )}
          {!loading && daySummary.partialFreeList.length > 0 ? (
            <ul className="space-y-1.5 text-[11px] max-h-28 overflow-auto">
              {daySummary.partialFreeList.map(({ emp, ranges }) => (
                <li key={emp.id} className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {emp.first_name} {emp.last_name}
                  </span>
                  {' — '}
                  {ranges.map((r) => r.label).join(', ')}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <DashboardHourlyGrid
        day={day}
        employees={activeEmployees}
        bookings={bookings}
        vehMap={vehMap}
        loading={loading}
      />
    </div>
  );
};

export default DailyDashboardTab;
