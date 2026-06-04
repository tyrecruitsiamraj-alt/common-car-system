import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import AppPage from '@/components/layout/AppPage';
import { mockEmployees } from '@/data/mockData';
import { formatCandidateDisplayName } from '@/lib/formatCandidateName';
import { formatThaiDate, formatThaiTimeRange } from '@/lib/thaiDateTimeFormat';
import type { Candidate, Employee, Vehicle, VehicleBooking } from '@/types';
import { isDemoMode } from '@/lib/demoMode';
import { apiFetch } from '@/lib/apiFetch';
import { parseWlEmployeeCandidateId, isWlStaffingTrack } from '@/lib/wlFromCandidate';
import { getCandidates, hydrateCandidateStaffing } from '@/lib/demoStorage';
import { mergeCandidateSources } from '@/lib/mergeCandidates';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import ExportExcelButton from '@/components/shared/ExportExcelButton';
import ExportExcelDateRangeDialog from '@/components/shared/ExportExcelDateRangeDialog';
import { toYmdLocal } from '@/lib/dateTh';
import { ymdRangeToFetchIsoBounds, type ExportYmdRange } from '@/lib/exportDateRange';
import {
  buildDriverBookingRows,
  buildDriverDestinationStats,
  buildDriverVehicleUsage,
  countEarlyBookings,
  countLateBookings,
  DRIVER_BOOKING_TIMING_LABEL,
  type DriverBookingTiming,
} from '@/lib/driverBookingHistory';
import { exportDriverProfileExcel } from '@/lib/fleetExcelExport';
import { toast } from 'sonner';
import { bookingEffectiveEnd } from '@/lib/fleetBookingsDashboard';
import { formatBookingWorkOrderNo } from '@/lib/bookingWorkOrder';

const HISTORY_DAYS = 365;

const TIMING_CLASS: Record<DriverBookingTiming, string> = {
  early: 'bg-emerald-500/15 text-emerald-800 ring-emerald-600/25',
  late: 'bg-red-500/15 text-red-800 ring-red-600/25',
  on_time: 'bg-slate-100 text-slate-700 ring-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
};

function HistorySection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-white/80 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {children ?? <p className="text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}

const EmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [wlCandidate, setWlCandidate] = useState<Candidate | null>(null);
  const [bookings, setBookings] = useState<VehicleBooking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEmployee(null);
    setWlCandidate(null);

    const candId = parseWlEmployeeCandidateId(id);

    if (candId) {
      if (isDemoMode()) {
        const list = mergeCandidateSources([], getCandidates());
        const c = list.find((x) => x.id === candId);
        if (!cancelled) {
          if (c && isWlStaffingTrack(c)) {
            setWlCandidate(c);
            setError(null);
          } else {
            setError('ไม่พบผู้สมัครในกลุ่ม WL หรือถูกเปลี่ยนประเภทแล้ว');
          }
          setLoading(false);
        }
        return () => {
          cancelled = true;
        };
      }

      apiFetch(`/api/candidates?id=${encodeURIComponent(candId)}`)
        .then(async (r) => {
          if (!r.ok) throw new Error('ไม่พบข้อมูลผู้สมัคร');
          return r.json() as Promise<Candidate>;
        })
        .then((c) => {
          if (cancelled) return;
          const h = hydrateCandidateStaffing(c);
          if (isWlStaffingTrack(h)) {
            setWlCandidate(h);
            setError(null);
          } else {
            setError('ผู้สมัครนี้ไม่ได้อยู่ในกลุ่ม WL');
          }
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    if (isDemoMode()) {
      const found = mockEmployees.find((e) => e.id === id) ?? null;
      if (!cancelled) {
        setEmployee(found);
        setError(found ? null : 'ไม่พบข้อมูลพนักงาน');
        setLoading(false);
      }
      return () => {
        cancelled = true;
      };
    }

    apiFetch(`/api/employees?id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error || `HTTP ${r.status}`);
        }
        return r.json() as Promise<Employee>;
      })
      .then((data) => {
        if (cancelled) return;
        setEmployee(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadFleetHistory = useCallback(async (employeeId: string) => {
    if (isDemoMode()) {
      setBookings([]);
      setVehicles([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const from = subDays(new Date(), HISTORY_DAYS);
      const to = new Date();
      const q = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const [rB, rV] = await Promise.all([
        apiFetch(`/api/vehicle-bookings?${q}`),
        apiFetch('/api/vehicles'),
      ]);
      const allBookings = rB.ok ? ((await rB.json()) as VehicleBooking[]) : [];
      const vehList = rV.ok ? ((await rV.json()) as Vehicle[]) : [];
      setBookings(
        Array.isArray(allBookings) ? allBookings.filter((b) => b.employee_id === employeeId) : [],
      );
      setVehicles(Array.isArray(vehList) ? vehList : []);
    } catch {
      setBookings([]);
      setVehicles([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id || parseWlEmployeeCandidateId(id) || !employee) return;
    void loadFleetHistory(employee.id);
  }, [id, employee, loadFleetHistory]);

  const vehMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const vehLabel = useCallback(
    (vid: string) => vehMap.get(vid)?.plate_no?.trim() || '—',
    [vehMap],
  );

  const earlyCount = useMemo(() => countEarlyBookings(bookings), [bookings]);
  const lateCount = useMemo(() => countLateBookings(bookings), [bookings]);
  const jobRows = useMemo(
    () => buildDriverBookingRows(bookings, vehMap, vehLabel),
    [bookings, vehMap, vehLabel],
  );
  const vehicleUsage = useMemo(
    () => buildDriverVehicleUsage(bookings, vehMap, vehLabel),
    [bookings, vehMap, vehLabel],
  );
  const destinations = useMemo(() => buildDriverDestinationStats(bookings), [bookings]);

  const defaultExportRange = useMemo(
    (): ExportYmdRange => ({
      fromYmd: toYmdLocal(subDays(new Date(), 30)),
      toYmd: format(new Date(), 'yyyy-MM-dd'),
    }),
    [],
  );

  const handleExportProfileExcel = useCallback(() => {
    setExportDialogOpen(true);
  }, []);

  const runExportProfileExcel = useCallback(
    async (range: ExportYmdRange) => {
      if (!employee) return;
      if (isDemoMode()) {
        toast.message('โหมดสาธิตไม่มีประวัติการจองจาก API');
        return;
      }
      const bounds = ymdRangeToFetchIsoBounds(range.fromYmd, range.toYmd);
      if (!bounds) {
        toast.error('ช่วงวันที่ไม่ถูกต้อง');
        return;
      }
      setExportingExcel(true);
      try {
        const q = new URLSearchParams({ from: bounds.fromIso, to: bounds.toIso });
        const [rB, rV] = await Promise.all([
          apiFetch(`/api/vehicle-bookings?${q}`),
          apiFetch('/api/vehicles'),
        ]);
        const allBookings = rB.ok ? ((await rB.json()) as VehicleBooking[]) : [];
        const vehList = rV.ok ? ((await rV.json()) as Vehicle[]) : [];
        const vehMapExport = new Map(
          (Array.isArray(vehList) ? vehList : []).map((v) => [v.id, v]),
        );
        const vehLabelExport = (vid: string) => vehMapExport.get(vid)?.plate_no?.trim() || '—';
        const empBookings = (Array.isArray(allBookings) ? allBookings : []).filter(
          (b) => b.employee_id === employee.id,
        );
        if (empBookings.length === 0) {
          toast.message('ไม่มีข้อมูลในช่วงวันที่เลือก');
          return;
        }
        const rows = buildDriverBookingRows(empBookings, vehMapExport, vehLabelExport);
        const usage = buildDriverVehicleUsage(empBookings, vehMapExport, vehLabelExport);
        const dests = buildDriverDestinationStats(empBookings);
        const early = countEarlyBookings(empBookings);
        const late = countLateBookings(empBookings);
        exportDriverProfileExcel(employee, rows, usage, dests, early, late, range);
        toast.success(`ส่งออก Excel แล้ว (${rows.length} งาน)`);
        setExportDialogOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'ส่งออก Excel ไม่สำเร็จ');
      } finally {
        setExportingExcel(false);
      }
    },
    [employee],
  );

  if (loading) {
    return (
      <AppPage maxWidth="3xl">
        <p className="text-muted-foreground">กำลังโหลด…</p>
      </AppPage>
    );
  }

  if (wlCandidate) {
    return (
      <AppPage maxWidth="3xl" panel>
        <PageHeader title={formatCandidateDisplayName(wlCandidate)} backPath="/fleet/drivers" />
        <div className="rounded-2xl border border-border/80 bg-white/80 p-5 shadow-sm space-y-2">
          <p className="text-lg font-bold text-foreground">{formatCandidateDisplayName(wlCandidate)}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">เบอร์โทร </span>
            {wlCandidate.phone?.trim() || '—'}
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          รายชื่อนี้เชื่อมกับผู้สมัคร WL — ยังไม่มีประวัติการจองรถในระบบ Fleet
        </p>
      </AppPage>
    );
  }

  if (error) {
    return (
      <AppPage maxWidth="3xl">
        <p className="text-destructive">{error}</p>
      </AppPage>
    );
  }

  if (!employee) {
    return (
      <AppPage maxWidth="3xl">
        <p className="text-muted-foreground">ไม่พบข้อมูลผู้ขับ</p>
      </AppPage>
    );
  }

  return (
    <AppPage maxWidth="3xl" panel>
      <PageHeader
        title="Driver"
        backPath="/fleet/drivers"
        actions={
          <ExportExcelButton
            onClick={handleExportProfileExcel}
            disabled={historyLoading || exportingExcel}
          />
        }
      />

      <ExportExcelDateRangeDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        title="ส่งออกประวัติผู้ขับเป็น Excel"
        description="เลือกช่วงวันที่ของประวัติการจองที่ต้องการส่งออก"
        defaultFromYmd={defaultExportRange.fromYmd}
        defaultToYmd={defaultExportRange.toYmd}
        exporting={exportingExcel}
        onConfirm={runExportProfileExcel}
      />

      <div className="rounded-2xl border border-border/80 bg-white/80 p-5 shadow-sm space-y-3">
        {employee.title_prefix?.trim() ? (
          <p className="text-sm text-muted-foreground">{employee.title_prefix.trim()}</p>
        ) : null}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ชื่อ</p>
            <p className="text-xl font-bold text-foreground">{employee.first_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">นามสกุล</p>
            <p className="text-xl font-bold text-foreground">{employee.last_name}</p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">เบอร์โทร</p>
        <p className="text-lg text-foreground tabular-nums">{employee.phone?.trim() || '—'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-center">
          <p className="text-3xl font-bold tabular-nums text-red-800">{lateCount}</p>
          <p className="text-xs font-medium text-red-900/80 mt-1">งานเกินเวลา</p>
          <p className="text-[10px] text-red-800/70 mt-0.5">เสร็จหลังเวลาที่จอง หรือเลยเวลาแล้วยังไม่เสร็จ</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center">
          <p className="text-3xl font-bold tabular-nums text-emerald-800">{earlyCount}</p>
          <p className="text-xs font-medium text-emerald-900/80 mt-1">งานก่อนเวลา</p>
          <p className="text-[10px] text-emerald-800/70 mt-0.5">กดเสร็จสิ้นก่อนเวลาสิ้นสุดที่จอง</p>
        </div>
      </div>

      {historyLoading ? <p className="text-sm text-muted-foreground">กำลังโหลดประวัติการจอง…</p> : null}

      <HistorySection
        title="ประวัติการใช้รถ"
        empty="ยังไม่มีประวัติการใช้รถ"
      >
        {vehicleUsage.length > 0 ? (
          <ul className="space-y-2">
            {vehicleUsage.map((row) => (
              <li
                key={row.vehicleId}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-slate-50/80 px-3 py-2.5 text-sm"
              >
                <span className="font-semibold text-foreground">{row.label}</span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {row.tripCount} ครั้ง · ล่าสุด {formatThaiDate(row.lastAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </HistorySection>

      <HistorySection
        title="ประวัติสถานที่ที่เคยไป"
        empty="ยังไม่มีปลายทางที่บันทึก"
      >
        {destinations.length > 0 ? (
          <ul className="space-y-2">
            {destinations.map((row) => (
              <li
                key={row.destination}
                className="flex items-start justify-between gap-2 rounded-xl border border-border/60 bg-slate-50/80 px-3 py-2.5 text-sm"
              >
                <span className="font-medium text-foreground">{row.destination}</span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums text-right">
                  {row.tripCount} ครั้ง
                  <br />
                  {formatThaiDate(row.lastAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </HistorySection>

      <HistorySection title="ประวัติงาน" empty="ยังไม่มีงาน (การจอง)">
        {jobRows.length > 0 ? (
          <ul className="space-y-2 max-h-[min(50vh,28rem)] overflow-y-auto pr-0.5">
            {jobRows.map(({ booking, timing, destinationLabel, vehicleLabel }) => (
              <li
                key={booking.id}
                className="rounded-xl border border-border/60 bg-slate-50/80 px-3 py-2.5 space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-primary">
                      {formatBookingWorkOrderNo(booking)}
                    </p>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatThaiDate(booking.starts_at)} ·{' '}
                      {formatThaiTimeRange(booking.starts_at, bookingEffectiveEnd(booking))}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-semibold rounded-full px-2 py-0.5 ring-1',
                      TIMING_CLASS[timing],
                    )}
                  >
                    {DRIVER_BOOKING_TIMING_LABEL[timing]}
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">รถ </span>
                  {vehicleLabel}
                </p>
                <p className="text-sm text-foreground/90">
                  <span className="text-muted-foreground">สถานที่ </span>
                  {destinationLabel}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </HistorySection>

      {!historyLoading && jobRows.length > 0 ? (
        <p className="text-[10px] text-muted-foreground text-center">
          สรุปจากการจอง {HISTORY_DAYS} วันล่าสุด ({jobRows.length} งาน)
        </p>
      ) : null}
    </AppPage>
  );
};

export default EmployeeProfile;
