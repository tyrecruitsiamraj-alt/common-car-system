import React from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BOOKING_ROW_STATUS_META } from '@/components/fleet/FleetBookingsDashboard';
import { formatBookingWorkOrderNo } from '@/lib/bookingWorkOrder';
import {
  bookingEffectiveEnd,
  deriveBookingListStatus,
} from '@/lib/fleetBookingsDashboard';
import { formatThaiDateTime, formatThaiTimeRange } from '@/lib/thaiDateTimeFormat';
import { cn } from '@/lib/utils';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

type Props = {
  booking: VehicleBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empMap: Map<string, Employee>;
  vehMap: Map<string, Vehicle>;
  empLabel: (id: string) => string;
  vehLabel: (id: string) => string;
  footer?: React.ReactNode;
};

export default function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
  empMap,
  vehMap,
  empLabel,
  vehLabel,
  footer,
}: Props) {
  const emp = booking ? empMap.get(booking.employee_id) : undefined;
  const veh = booking ? vehMap.get(booking.vehicle_id) : undefined;
  const status = booking ? deriveBookingListStatus(booking) : null;
  const statusMeta = status ? BOOKING_ROW_STATUS_META[status] : null;
  const dest = booking?.destination?.trim() ?? '';
  const note = booking?.notes?.trim() ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md rounded-[1.5rem]">
        {booking ? (
          <>
            <DialogHeader>
              <DialogTitle>รายละเอียดการจอง</DialogTitle>
              <DialogDescription className="text-left">
                เลขใบงาน {formatBookingWorkOrderNo(booking)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">ผู้ขับ</p>
                  <p className="font-semibold text-foreground">{empLabel(booking.employee_id)}</p>
                  {emp?.employee_code ? (
                    <p className="text-xs text-muted-foreground mt-0.5">{emp.employee_code}</p>
                  ) : null}
                  {emp?.position?.trim() ? (
                    <p className="text-xs text-muted-foreground">{emp.position.trim()}</p>
                  ) : null}
                </div>
                {statusMeta ? (
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                      statusMeta.className,
                    )}
                  >
                    {statusMeta.label}
                  </span>
                ) : null}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">รถ</p>
                <p className="font-semibold text-foreground">{veh?.plate_no ?? vehLabel(booking.vehicle_id)}</p>
                {veh?.label?.trim() ? (
                  <p className="text-xs text-muted-foreground mt-0.5">{veh.label.trim()}</p>
                ) : null}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">ช่วงเวลา</p>
                <p className="font-medium text-foreground tabular-nums">
                  {formatThaiTimeRange(booking.starts_at, bookingEffectiveEnd(booking))}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {format(parseISO(booking.starts_at), 'EEEE d MMMM yyyy', { locale: th })}
                </p>
                {booking.completed_at ? (
                  <p className="text-xs text-emerald-700 mt-1">
                    เสร็จสิ้นเมื่อ {formatThaiDateTime(parseISO(booking.completed_at))}
                  </p>
                ) : null}
              </div>

              {dest ? (
                <div>
                  <p className="text-xs text-muted-foreground">สถานที่ที่ไป</p>
                  <p className="text-foreground whitespace-pre-wrap break-words">{dest}</p>
                </div>
              ) : null}

              {note ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">หมายเหตุ</p>
                  <p className="text-foreground whitespace-pre-wrap break-words mt-0.5">{note}</p>
                </div>
              ) : null}

              {footer ? <div className="pt-1 border-t border-border/60">{footer}</div> : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
