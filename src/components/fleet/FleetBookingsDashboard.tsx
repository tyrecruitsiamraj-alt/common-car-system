import React from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Car,
  ChevronDown,
  Filter,
  Fuel,
  Gauge,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardMetricId } from '@/lib/fleetBookingsDashboard';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type BookingListStatus = 'all' | 'inProgress' | 'completed';

export const BOOKING_LIST_STATUS_FILTERS: BookingListStatus[] = ['all', 'inProgress', 'completed'];

export const BOOKING_STATUS_META: Record<
  BookingListStatus,
  { label: string; className: string }
> = {
  all: { label: 'ทั้งหมด', className: 'bg-slate-900 text-white' },
  inProgress: { label: 'กำลังใช้งาน', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export const BOOKING_ROW_STATUS_META: Record<
  Exclude<BookingListStatus, 'all'>,
  { label: string; className: string }
> = {
  inProgress: { label: 'กำลังใช้งาน', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export type DashboardBookingRow = {
  id: string;
  requester: string;
  department: string;
  route: string;
  car: string;
  driver: string;
  date: string;
  time: string;
  status: Exclude<BookingListStatus, 'all'>;
  priority: string;
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

export type DashboardVehicleUsage = {
  name: string;
  plate: string;
  value: number;
  label: string;
};

export type DashboardSidebarStats = {
  fuel: string;
  km: string;
  users: string;
};

type Props = {
  title?: string;
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
  utilizationPct: number;
  utilizationSummary: string;
  sidebarStats: DashboardSidebarStats;
  topVehicles: DashboardVehicleUsage[];
  onCreateBooking?: () => void;
  onMetricClick?: (id: DashboardMetricId) => void;
  renderBookingMenu?: (bookingId: string) => React.ReactNode;
  children?: React.ReactNode;
};

function StatusPill({ status }: { status: Exclude<BookingListStatus, 'all'> }) {
  const meta = BOOKING_ROW_STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1',
        meta.className,
      )}
    >
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
    'w-full rounded-3xl border border-white/70 bg-white/80 p-5 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100';
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        {clickable ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">ดูรายละเอียด</span>
        ) : null}
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <h3 className="text-3xl font-bold tracking-tight text-slate-950">{value}</h3>
        <p className="pb-1 text-xs text-slate-400">{helper}</p>
      </div>
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
export default function FleetBookingsDashboard({
  title = 'Fleet Bookings',
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
  utilizationPct,
  utilizationSummary,
  sidebarStats,
  topVehicles,
  onCreateBooking,
  onMetricClick,
  renderBookingMenu,
  children,
}: Props) {
  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/65 shadow-2xl shadow-slate-200/70 backdrop-blur-xl">
          <header className="border-b border-slate-200/70 px-5 py-4 md:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
                  <Car className="h-6 w-6" />
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Sparkles className="h-4 w-4" /> Common Car System
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{title}</h1>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {onDayChange && dayValue ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        <CalendarDays className="h-4 w-4" /> {dayLabel}
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-2xl border-slate-200 p-3" align="end">
                      <Label className="text-xs text-slate-600">เลือกวันที่</Label>
                      <Input
                        type="date"
                        className="mt-1.5 h-10 rounded-xl"
                        value={dayValue}
                        onChange={(e) => onDayChange(e.target.value)}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    <CalendarDays className="h-4 w-4" /> {dayLabel}
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                )}
                {!isMonitor && onCreateBooking ? (
                  <button
                    type="button"
                    onClick={onCreateBooking}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" /> สร้างการจองใหม่
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1fr_360px]">
            <section className="space-y-6 min-w-0">
              <div className="grid gap-4 md:grid-cols-4">
                {metrics.map((m) => (
                  <MetricCard key={m.id ?? m.label} metric={m} onClick={onMetricClick} />
                ))}
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      placeholder="ค้นหาเลขจอง ผู้ขอใช้รถ แผนก หรือทะเบียนรถ"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm"
                  >
                    <Filter className="h-4 w-4" /> ตัวกรองขั้นสูง
                  </button>
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {BOOKING_LIST_STATUS_FILTERS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onStatusFilterChange(key)}
                      className={cn(
                        'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition',
                        statusFilter === key
                          ? 'bg-slate-950 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                      )}
                    >
                      {BOOKING_STATUS_META[key].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-sm backdrop-blur">
                <div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <div className="col-span-3">Booking</div>
                  <div className="col-span-3 hidden lg:block">Route</div>
                  <div className="col-span-2 hidden md:block">Vehicle</div>
                  <div className="col-span-2 hidden md:block">Schedule</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>

                <div className="divide-y divide-slate-100">
                  {bookings.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-slate-500">ไม่มีรายการจองในช่วงที่เลือก</p>
                  ) : (
                    bookings.map((booking) => (
                      <article
                        key={booking.rawId}
                        className="grid grid-cols-12 items-center gap-3 px-5 py-4 transition hover:bg-blue-50/40"
                      >
                        <div className="col-span-8 md:col-span-3">
                          <p className="font-bold text-slate-950">{booking.requester}</p>
                          <p className="mt-1 text-xs font-medium text-slate-400">
                            {booking.id} • {booking.department}
                          </p>
                        </div>

                        <div className="col-span-3 hidden lg:block">
                          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
                            <span className="line-clamp-2">{booking.route}</span>
                          </p>
                          <p className="mt-1 text-xs text-slate-400">Priority: {booking.priority}</p>
                        </div>

                        <div className="col-span-2 hidden md:block">
                          <p className="text-sm font-semibold text-slate-800 line-clamp-2">{booking.car}</p>
                          <p className="mt-1 text-xs text-slate-400">คนขับ: {booking.driver}</p>
                        </div>

                        <div className="col-span-2 hidden md:block">
                          <p className="text-sm font-bold text-slate-800">{booking.date}</p>
                          <p className="mt-1 text-xs text-slate-400">{booking.time}</p>
                        </div>

                        <div className="col-span-4 flex items-center justify-end gap-3 md:col-span-2">
                          <StatusPill status={booking.status} />
                          {renderBookingMenu ? (
                            renderBookingMenu(booking.rawId)
                          ) : (
                            <button
                              type="button"
                              className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="เมนู"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              {children}
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-300">
                <p className="text-sm font-semibold text-blue-200">ภาพรวมการใช้งานรถ</p>
                <h2 className="mt-2 text-2xl font-bold">Fleet Utilization {utilizationPct}%</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{utilizationSummary}</p>

                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Fuel className="mx-auto h-5 w-5 text-blue-200" />
                    <p className="mt-2 text-lg font-bold">{sidebarStats.fuel}</p>
                    <p className="text-[11px] text-slate-400">Fuel</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Gauge className="mx-auto h-5 w-5 text-blue-200" />
                    <p className="mt-2 text-lg font-bold">{sidebarStats.km}</p>
                    <p className="text-[11px] text-slate-400">Km</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Users className="mx-auto h-5 w-5 text-blue-200" />
                    <p className="mt-2 text-lg font-bold">{sidebarStats.users}</p>
                    <p className="text-[11px] text-slate-400">Users</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-950">รถที่ถูกใช้งานบ่อย</h3>
                  <Link to="/fleet/vehicles" className="text-sm font-semibold text-blue-600 hover:underline">
                    ดูทั้งหมด
                  </Link>
                </div>

                <div className="mt-5 space-y-4">
                  {topVehicles.length === 0 ? (
                    <p className="text-sm text-slate-500">ยังไม่มีข้อมูลในช่วงนี้</p>
                  ) : (
                    topVehicles.map((vehicle) => (
                      <div key={vehicle.plate} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{vehicle.name}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {vehicle.plate} • {vehicle.label}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-slate-700 shrink-0">{vehicle.value}%</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-slate-950 transition-all"
                            style={{ width: `${vehicle.value}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
