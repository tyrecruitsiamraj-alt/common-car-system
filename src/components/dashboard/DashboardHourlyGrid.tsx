import React from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_PLANNER_HOURS,
  bookingOverlapsLocalHour,
  isIncidentBooking,
} from '@/lib/fleetDashboardStats';
import { isBookingActive } from '@/lib/fleetBookingsDashboard';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

type Props = {
  day: Date;
  employees: Employee[];
  bookings: VehicleBooking[];
  vehMap: Map<string, Vehicle>;
  loading?: boolean;
};

function plateShort(id: string, vehMap: Map<string, Vehicle>): string {
  return vehMap.get(id)?.plate_no?.trim() || '?';
}

const DashboardHourlyGrid: React.FC<Props> = ({ day, employees, bookings, vehMap, loading }) => {
  if (loading) {
    return <p className="text-xs text-muted-foreground py-4">กำลังโหลดตารางรายชั่วโมง…</p>;
  }
  if (employees.length === 0) {
    return <p className="text-xs text-muted-foreground py-4">ไม่มีพนักงาน active ในระบบ</p>;
  }

  return (
      <div className="glass-card p-3 space-y-2 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">ตารางรายชั่วโมง — ใครว่างช่วงไหน</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm bg-emerald-500/50 border border-emerald-600/40" />
            ว่าง
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm bg-primary/50 border border-primary/50" />
            มีจอง
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-sm bg-amber-500/55 border border-amber-700/40" />
            อุบัติเหตุ
          </span>
        </div>
      </div>
      <div className="overflow-auto max-h-[28rem] -mx-1 px-1">
        <div
          className="w-full border border-border rounded-md overflow-hidden bg-background/50"
          style={{ minWidth: `${8.5 * 16 + DASHBOARD_PLANNER_HOURS.length * 2.75}rem` }}
        >
          <div
            className="grid border-b border-border bg-muted/95 text-muted-foreground sticky top-0 z-10"
            style={{ gridTemplateColumns: `8.5rem repeat(${DASHBOARD_PLANNER_HOURS.length}, minmax(2.75rem, 1fr))` }}
          >
            <div className="px-1 py-1 text-[10px] font-medium text-foreground border-r border-border/60">
              พนักงาน
            </div>
            {DASHBOARD_PLANNER_HOURS.map((h) => (
              <div key={h} className="min-w-0 border-l border-border/50 py-0.5 text-center">
                <span className="text-[8px] sm:text-[9px] font-semibold tabular-nums text-foreground">
                  {String(h).padStart(2, '0')}.00
                </span>
              </div>
            ))}
          </div>
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="grid border-b border-border/60 last:border-b-0"
              style={{ gridTemplateColumns: `8.5rem repeat(${DASHBOARD_PLANNER_HOURS.length}, minmax(2.75rem, 1fr))` }}
            >
              <div className="px-1 py-1 text-[10px] leading-tight border-r border-border/60 bg-muted/10 min-w-0">
                <div className="font-medium text-foreground line-clamp-2" title={`${emp.first_name} ${emp.last_name}`}>
                  {emp.first_name} {emp.last_name}
                </div>
                <div className="text-[9px] text-muted-foreground truncate">{emp.employee_code}</div>
              </div>
              {DASHBOARD_PLANNER_HOURS.map((h) => {
                const slotBs = bookings.filter(
                  (b) =>
                    isBookingActive(b) &&
                    b.employee_id === emp.id &&
                    bookingOverlapsLocalHour(b, day, h),
                );
                const busy = slotBs.length > 0;
                const incident = slotBs.some(isIncidentBooking);
                const first = slotBs[0];
                const title = busy
                  ? slotBs
                      .map(
                        (b) =>
                          `${plateShort(b.vehicle_id, vehMap)} ${format(parseISO(b.starts_at), 'HH:mm')}–${format(parseISO(b.ends_at), 'HH:mm')}`,
                      )
                      .join(' | ')
                  : `${String(h).padStart(2, '0')}:00`;
                return (
                  <div
                    key={h}
                    title={title}
                    className={cn(
                      'min-h-[2rem] min-w-0 border-l border-border/40 p-px text-[7px] sm:text-[8px]',
                      !busy && 'bg-emerald-500/15',
                      busy && !incident && 'bg-primary/25 border border-primary/20',
                      busy && incident && 'bg-amber-500/30 border border-amber-600/35',
                    )}
                  >
                    {busy && first ? (
                      <span className="line-clamp-2 break-words block text-left px-0.5">
                        {plateShort(first.vehicle_id, vehMap)}
                      </span>
                    ) : (
                      <span className="sr-only">ว่าง</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHourlyGrid;
