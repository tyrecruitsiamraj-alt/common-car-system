import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { useWlEmployees } from '@/hooks/useWlEmployees';
import { apiFetch } from '@/lib/apiFetch';
import { isDemoMode } from '@/lib/demoMode';
import type { Employee, Vehicle, VehicleBooking } from '@/types';
import { Car, Users, AlertTriangle, BarChart3, TrendingUp, Clock, type LucideIcon } from 'lucide-react';
import { endOfDay, parseISO, subDays } from 'date-fns';

const ANALYSIS_DAYS = 365;
/** การจองครั้งเดียวยาวกว่านี้ถือว่า “เกินเวลา” สำหรับอันดับ */
const OVERTIME_HOURS = 8;

/** สอดคล้องกับ FleetBookingsPage — อุบัติเหตุจากหมายเหตุการจอง */
function isIncidentBooking(b: VehicleBooking): boolean {
  const n = (b.notes || '').trim();
  return /อุบัติ|อุบัติเหตุ|accident|crash|ชน/i.test(n);
}

function bookingDurationHours(b: VehicleBooking): number {
  const ms = parseISO(b.ends_at).getTime() - parseISO(b.starts_at).getTime();
  return ms / 3_600_000;
}

function isOvertimeBooking(b: VehicleBooking): boolean {
  return bookingDurationHours(b) > OVERTIME_HOURS;
}

type RankItem = { id: string; label: string; count: number };

function topByKey(bookings: VehicleBooking[], key: 'vehicle_id' | 'employee_id', limit: number, labelFor: (id: string) => string): RankItem[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const id = b[key];
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, label: labelFor(id), count }));
}

function DashboardRankCard({
  title,
  subtitle,
  icon: Icon,
  items,
  loading,
  emptyText,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  items: RankItem[];
  loading: boolean;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/50 p-4 space-y-2 min-h-[11rem]">
      <div className="flex items-start gap-2">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{subtitle}</p>
        </div>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground py-2">กำลังโหลด…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{emptyText}</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((row, i) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 text-xs rounded-md border border-border/60 bg-background/40 px-2 py-1.5"
            >
              <span className="text-muted-foreground tabular-nums shrink-0 w-5">{i + 1}.</span>
              <span className="flex-1 min-w-0 truncate font-medium text-foreground" title={row.label}>
                {row.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{row.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const SupervisorDashboard: React.FC = () => {
  const { employees, loading: empLoading } = useWlEmployees();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [fleetLoading, setFleetLoading] = useState(!isDemoMode());

  const activePeople = useMemo(
    () => employees.filter((e) => e.status === 'active').length,
    [employees],
  );

  useEffect(() => {
    if (isDemoMode()) {
      setVehicles([]);
      setBookings([]);
      setFleetLoading(false);
      return;
    }
    let cancelled = false;
    const from = subDays(new Date(), ANALYSIS_DAYS);
    const to = endOfDay(new Date());
    const q = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    (async () => {
      setFleetLoading(true);
      try {
        const [rV, rB] = await Promise.all([apiFetch('/api/vehicles'), apiFetch(`/api/vehicle-bookings?${q}`)]);
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
  }, []);

  const vehicleCount = useMemo(() => vehicles.filter((v) => v.is_active !== false).length, [vehicles]);
  const incidentCount = useMemo(() => bookings.filter(isIncidentBooking).length, [bookings]);
  const loading = empLoading || fleetLoading;

  const empById = useMemo(() => new Map(employees.map((e: Employee) => [e.id, e])), [employees]);
  const vehById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

  const empLabel = (id: string) => {
    const e = empById.get(id);
    return e ? `${e.first_name} ${e.last_name}`.trim() || e.employee_code : id.slice(0, 8);
  };
  const plateLabel = (id: string) => vehById.get(id)?.plate_no?.trim() || id.slice(0, 8);

  const topUsedVehicles = useMemo(() => topByKey(bookings, 'vehicle_id', 5, plateLabel), [bookings, vehById]);
  const topUsedEmployees = useMemo(() => topByKey(bookings, 'employee_id', 5, empLabel), [bookings, empById]);

  const overtimeBookings = useMemo(() => bookings.filter(isOvertimeBooking), [bookings]);
  const topOvertimeEmployees = useMemo(
    () => topByKey(overtimeBookings, 'employee_id', 5, empLabel),
    [overtimeBookings, empById],
  );
  const topOvertimeVehicles = useMemo(
    () => topByKey(overtimeBookings, 'vehicle_id', 5, plateLabel),
    [overtimeBookings, vehById],
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`สรุปรถ ผู้ขับ และการจอง (ช่วง ${ANALYSIS_DAYS} วันล่าสุด) · อุบัติเหตุจากหมายเหตุ · เกินเวลา = การจองครั้งเดียวยาวกว่า ${OVERTIME_HOURS} ชม.`}
      />
      <div className="px-4 md:px-6 space-y-6 pb-12 max-w-4xl mx-auto">
        <div className="rounded-xl border border-border/80 bg-card/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">ภาพรวม</p>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล…</p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              รถที่เปิดใช้งาน <strong className="text-foreground">{vehicleCount}</strong> คัน · ผู้ขับสถานะ active{' '}
              <strong className="text-foreground">{activePeople}</strong> คน · การจองที่มีคำว่าอุบัติเหตุในหมายเหตุ{' '}
              <strong className={incidentCount > 0 ? 'text-destructive' : 'text-foreground'}>{incidentCount}</strong> ครั้ง
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard title="จำนวนรถ" value={vehicleCount} icon={Car} variant="primary" subtitle="รถที่เปิดใช้งาน" />
          <StatCard title="จำนวนคน" value={activePeople} icon={Users} variant="success" subtitle="ผู้ขับ active" />
          <StatCard
            title="จำนวนอุบัติเหตุ"
            value={incidentCount}
            icon={AlertTriangle}
            variant={incidentCount > 0 ? 'destructive' : 'default'}
            subtitle={`จากหมายเหตุการจอง ${ANALYSIS_DAYS} วันล่าสุด`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DashboardRankCard
            title="รถที่ถูกใช้บ่อย"
            subtitle={`อันดับจากจำนวนครั้งการจอง (${ANALYSIS_DAYS} วันล่าสุด)`}
            icon={TrendingUp}
            items={topUsedVehicles}
            loading={loading}
            emptyText="ยังไม่มีการจองในช่วงนี้"
          />
          <DashboardRankCard
            title="คนที่ถูกใช้งานบ่อย"
            subtitle={`อันดับจากจำนวนครั้งการจอง (${ANALYSIS_DAYS} วันล่าสุด)`}
            icon={TrendingUp}
            items={topUsedEmployees}
            loading={loading}
            emptyText="ยังไม่มีการจองในช่วงนี้"
          />
          <DashboardRankCard
            title="คนที่เกินเวลา"
            subtitle={`นับครั้งที่การจองครั้งเดียวยาวกว่า ${OVERTIME_HOURS} ชม.`}
            icon={Clock}
            items={topOvertimeEmployees}
            loading={loading}
            emptyText="ไม่มีการจองที่เกินเกณฑ์ในช่วงนี้"
          />
          <DashboardRankCard
            title="รถที่เกินเวลา"
            subtitle={`นับครั้งที่การจองครั้งเดียวยาวกว่า ${OVERTIME_HOURS} ชม.`}
            icon={Clock}
            items={topOvertimeVehicles}
            loading={loading}
            emptyText="ไม่มีการจองที่เกินเกณฑ์ในช่วงนี้"
          />
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
