import React from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardMetricId } from '@/lib/fleetBookingsDashboard';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import DateSelectDmyBe from '@/components/shared/DateSelectDmyBe';
import ExportExcelButton from '@/components/shared/ExportExcelButton';

export type BookingListStatus = 'all' | 'inProgress' | 'completed' | 'cancelled';

export const BOOKING_LIST_STATUS_FILTERS: BookingListStatus[] = [
  'all',
  'inProgress',
  'completed',
  'cancelled',
];

type StatusKey = Exclude<BookingListStatus, 'all'>;

export const BOOKING_STATUS_META: Record<
  BookingListStatus,
  { label: string; dot: string; pill: string }
> = {
  all: { label: 'All', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-700 ring-slate-200' },
  inProgress: {
    label: 'In progress',
    dot: 'bg-blue-500',
    pill: 'bg-blue-50 text-blue-700 ring-blue-200',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-slate-500',
    pill: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-red-500',
    pill: 'bg-red-50 text-red-700 ring-red-200',
  },
};

/** @deprecated use BOOKING_STATUS_META — kept for today-detail dialog */
export const BOOKING_ROW_STATUS_META: Record<
  Exclude<BookingListStatus, 'all'>,
  { label: string; className: string }
> = {
  inProgress: { label: BOOKING_STATUS_META.inProgress.label, className: BOOKING_STATUS_META.inProgress.pill },
  completed: { label: BOOKING_STATUS_META.completed.label, className: BOOKING_STATUS_META.completed.pill },
  cancelled: { label: BOOKING_STATUS_META.cancelled.label, className: BOOKING_STATUS_META.cancelled.pill },
};

export type DashboardBookingRow = {
  id: string;
  documentNo?: string;
  requester: string;
  department: string;
  route: string;
  vehicleName: string;
  plate: string;
  driver: string;
  date: string;
  time: string;
  status: StatusKey;
  subtitle: string;
  rawId: string;
};

export type DashboardMetric = {
  id?: DashboardMetricId;
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  clickable?: boolean;
};

export type SummaryEmployeeStats = {
  total: number;
  inUse: number;
  freeAllDay: number;
  partialFree: number;
};

type SummaryProps = {
  utilizationPct: number;
  inProgressToday: number;
  completedToday: number;
  cancelledToday: number;
  maintenanceCount: number;
  employeeStats?: SummaryEmployeeStats;
  summaryDayLabel?: string;
  onEmployeeFreeClick?: () => void;
  onEmployeePartialClick?: () => void;
  onEmployeeInUseClick?: () => void;
};

type Props = {
  title?: string;
  description?: string;
  isMonitor?: boolean;
  dayLabel: string;
  dayValue?: string;
  onDayChange?: (ymd: string) => void;
  metrics: DashboardMetric[];
  bookings: DashboardBookingRow[];
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: BookingListStatus;
  onStatusFilterChange: (s: BookingListStatus) => void;
  summary?: SummaryProps;
  showMetrics?: boolean;
  showSummary?: boolean;
  showBookingTable?: boolean;
  onCreateBooking?: () => void;
  onExportExcel?: () => void;
  exportExcelDisabled?: boolean;
  onMetricClick?: (id: DashboardMetricId) => void;
  onBookingRowClick?: (bookingId: string) => void;
  renderBookingMenu?: (bookingId: string) => React.ReactNode;
  /** คำอธิบายใต้หัวข้อตาราง Booking Requests */
  bookingsScopeLabel?: string;
  children?: React.ReactNode;
};

function StatusPill({ status }: { status: StatusKey }) {
  const meta = BOOKING_STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1',
        meta.pill,
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

function MetricCard({
  metric,
  onClick,
}: {
  metric: DashboardMetric;
  onClick?: (id: DashboardMetricId) => void;
}) {
  const { icon: Icon, label, value, helper, clickable, id } = metric;
  const className =
    'w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100';
  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</h3>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-400">{helper}</p>
      {clickable ? (
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-blue-600">ดูรายละเอียด</p>
      ) : null}
    </>
  );
  if (clickable && onClick && id) {
    return (
      <button type="button" className={className} onClick={() => onClick(id)}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

function SummaryStatButton({
  label,
  value,
  sub,
  onClick,
  className,
}: {
  label: string;
  value: number;
  sub?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      <p className="text-2xl font-bold text-slate-950 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-slate-600 mt-1">{label}</p>
      {sub ? <p className="text-[10px] text-blue-600 font-semibold mt-1.5">{sub}</p> : null}
    </>
  );
  const boxClass = cn(
    'rounded-xl p-3 text-left transition w-full',
    onClick && 'hover:ring-2 hover:ring-blue-200 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100',
    className ?? 'bg-slate-50',
  );
  if (onClick) {
    return (
      <button type="button" className={boxClass} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={boxClass}>{inner}</div>;
}

function SummaryPanel({
  utilizationPct,
  inProgressToday,
  completedToday,
  cancelledToday,
  maintenanceCount,
  employeeStats,
  summaryDayLabel,
  onEmployeeFreeClick,
  onEmployeePartialClick,
  onEmployeeInUseClick,
}: SummaryProps) {
  return (
    <aside className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-950">Today Summary</h3>
          {summaryDayLabel ? (
            <span className="text-[10px] font-medium text-slate-500 shrink-0">{summaryDayLabel}</span>
          ) : null}
        </div>

        {employeeStats ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Users className="h-4 w-4 text-slate-500" />
              Drivers
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SummaryStatButton label="Total" value={employeeStats.total} className="bg-slate-50" />
              <SummaryStatButton
                label="In use"
                value={employeeStats.inUse}
                sub={onEmployeeInUseClick ? 'ดูรายชื่อ' : undefined}
                onClick={onEmployeeInUseClick}
                className="bg-blue-50/80 border border-blue-100"
              />
              <SummaryStatButton
                label="Free all day"
                value={employeeStats.freeAllDay}
                sub={onEmployeeFreeClick ? 'ดูว่าใครว่าง' : undefined}
                onClick={onEmployeeFreeClick}
                className="bg-emerald-50/90 border border-emerald-100"
              />
              <SummaryStatButton
                label="Partially free"
                value={employeeStats.partialFree}
                sub={onEmployeePartialClick ? 'ดูช่วงเวลา' : undefined}
                onClick={onEmployeePartialClick}
                className="bg-amber-50/90 border border-amber-100"
              />
            </div>
          </div>
        ) : null}

        <div className={cn('space-y-4', employeeStats ? 'mt-5 pt-4 border-t border-slate-100' : 'mt-5')}>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">Fleet utilization</span>
              <span className="font-bold text-slate-950">{utilizationPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-slate-950" style={{ width: `${utilizationPct}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <Clock3 className="h-4 w-4 text-blue-600" />
              <p className="mt-2 text-xl font-bold text-slate-950 tabular-nums">{inProgressToday}</p>
              <p className="text-[10px] text-slate-500 leading-tight">In progress</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <CheckCircle2 className="h-4 w-4 text-slate-500" />
              <p className="mt-2 text-xl font-bold text-slate-950 tabular-nums">{completedToday}</p>
              <p className="text-[10px] text-slate-500 leading-tight">Completed</p>
            </div>
            <div className="rounded-xl bg-red-50/90 border border-red-100 p-3">
              <Ban className="h-4 w-4 text-red-600" />
              <p className="mt-2 text-xl font-bold text-slate-950 tabular-nums">{cancelledToday}</p>
              <p className="text-[10px] text-slate-600 leading-tight">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">Maintenance impact</h3>
            <p className="text-xs text-slate-500">{maintenanceCount} vehicle(s) in maintenance</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-950">Quick links</h3>
        <div className="mt-4 space-y-2">
          <Link to="/fleet/vehicles" className="block rounded-xl bg-slate-50 p-3 text-sm font-semibold text-blue-600 hover:bg-slate-100">
            View all vehicles
          </Link>
          <Link to="/fleet/drivers" className="block rounded-xl bg-slate-50 p-3 text-sm font-semibold text-blue-600 hover:bg-slate-100">
            View all drivers
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default function FleetBookingsDashboard({
  title = 'Bookings',
  description = 'จัดการคำขอใช้รถ ตรวจสอบสถานะ และติดตามรถกับคนขับ',
  isMonitor,
  dayLabel,
  dayValue,
  onDayChange,
  metrics,
  bookings,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  summary,
  showMetrics = true,
  showSummary = true,
  showBookingTable = true,
  onCreateBooking,
  onExportExcel,
  exportExcelDisabled,
  onMetricClick,
  onBookingRowClick,
  renderBookingMenu,
  bookingsScopeLabel,
  children,
}: Props) {
  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Fleet Management</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {onDayChange && dayValue ? (
              <div className="flex flex-col gap-1 min-w-[11rem]">
                <Label className="text-xs text-slate-600">วันที่</Label>
                <DateSelectDmyBe
                  value={dayValue}
                  onChange={onDayChange}
                  yearKind="ce"
                  triggerClassName="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium shadow-sm"
                  aria-label={dayLabel}
                />
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <CalendarDays className="h-4 w-4" /> {dayLabel}
              </button>
            )}
            {onExportExcel ? (
              <ExportExcelButton
                onClick={onExportExcel}
                disabled={exportExcelDisabled}
                label="Export Excel"
                className="h-10 rounded-xl border-slate-200 shadow-sm"
              />
            ) : null}
            {!isMonitor && onCreateBooking ? (
              <button
                type="button"
                onClick={onCreateBooking}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" /> สร้างการจองใหม่
              </button>
            ) : null}
          </div>
        </div>

        {showMetrics && metrics.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {metrics.map((m) => (
              <MetricCard key={m.id ?? m.label} metric={m} onClick={onMetricClick} />
            ))}
          </section>
        ) : null}

        {showBookingTable ? (
        <section className={cn('gap-6', showSummary && summary ? 'grid xl:grid-cols-[1fr_340px]' : '')}>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 md:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Booking Requests</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {bookingsScopeLabel ?? 'รายการจองรถทั้งหมดในระบบ Fleet'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      placeholder="ค้นหา booking, รถ, คนขับ"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 sm:w-72"
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Filter className="h-4 w-4" /> Filter
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {BOOKING_LIST_STATUS_FILTERS.map((key) => {
                  const meta = BOOKING_STATUS_META[key];
                  const active = statusFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onStatusFilterChange(key)}
                      className={cn(
                        'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition',
                        active
                          ? 'bg-slate-950 text-white ring-slate-950'
                          : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', active ? 'bg-white' : meta.dot)} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-bold">เลขใบงาน</th>
                    <th className="px-5 py-3 font-bold">เลขที่เอกสาร</th>
                    <th className="px-5 py-3 font-bold">Requester</th>
                    <th className="px-5 py-3 font-bold">Route</th>
                    <th className="px-5 py-3 font-bold">Vehicle</th>
                    <th className="px-5 py-3 font-bold">Driver</th>
                    <th className="px-5 py-3 font-bold">Schedule</th>
                    <th className="px-5 py-3 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-500">
                        ไม่มีรายการจองในช่วงที่เลือก
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr
                        key={booking.rawId}
                        className={cn(
                          'transition hover:bg-slate-50/80',
                          onBookingRowClick && 'cursor-pointer',
                        )}
                        onClick={
                          onBookingRowClick
                            ? () => onBookingRowClick(booking.rawId)
                            : undefined
                        }
                        onKeyDown={
                          onBookingRowClick
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onBookingRowClick(booking.rawId);
                                }
                              }
                            : undefined
                        }
                        tabIndex={onBookingRowClick ? 0 : undefined}
                        role={onBookingRowClick ? 'button' : undefined}
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">{booking.id}</p>
                          <p className="mt-1 text-xs text-slate-400">{booking.subtitle}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-800">{booking.documentNo || '—'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{booking.requester}</p>
                          <p className="mt-1 text-xs text-slate-400">{booking.department}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="line-clamp-2">{booking.route}</span>
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{booking.vehicleName}</p>
                          <p className="mt-1 text-xs text-slate-400">{booking.plate}</p>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-700">{booking.driver}</td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{booking.date}</p>
                          <p className="mt-1 text-xs text-slate-400">{booking.time}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <StatusPill status={booking.status} />
                            {renderBookingMenu ? (
                              <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                {renderBookingMenu(booking.rawId)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label="เมนู"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showSummary && summary ? <SummaryPanel {...summary} /> : null}
        </section>
        ) : null}

        {children}
      </div>
    </main>
  );
}


