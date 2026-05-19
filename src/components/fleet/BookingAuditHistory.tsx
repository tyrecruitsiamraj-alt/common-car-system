import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { apiFetch } from '@/lib/apiFetch';
import { diffBookingAuditEntry } from '@/lib/bookingAuditDisplay';
import type { Employee, Vehicle, VehicleBookingAudit } from '@/types';

const ACTION_LABEL: Record<VehicleBookingAudit['action'], string> = {
  created: 'สร้างจอง',
  updated: 'แก้ไข',
  cancelled: 'ยกเลิก',
};

type Props = {
  bookingId: string;
  empMap: Map<string, Employee>;
  vehMap: Map<string, Vehicle>;
};

export default function BookingAuditHistory({ bookingId, empMap, vehMap }: Props) {
  const [rows, setRows] = useState<VehicleBookingAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void apiFetch(
      `/api/vehicle-bookings?auditLog=1&booking_id=${encodeURIComponent(bookingId)}&from=1970-01-01T00:00:00.000Z&to=2099-01-01T00:00:00.000Z`,
    )
      .then(async (r) => {
        if (!r.ok) return { audit: [] as VehicleBookingAudit[] };
        return r.json() as Promise<{ audit?: VehicleBookingAudit[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data.audit) ? data.audit : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">กำลังโหลดประวัติ…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">ยังไม่มีประวัติการแก้ไข</p>;
  }

  return (
    <ul className="space-y-2 max-h-40 overflow-y-auto text-[11px]">
      {rows.map((a) => {
        const diffs = diffBookingAuditEntry(a, empMap, vehMap);
        return (
          <li key={a.id} className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 space-y-0.5">
            <div className="font-medium text-foreground">
              {ACTION_LABEL[a.action]}
              <span className="text-muted-foreground font-normal">
                {' '}
                · {format(parseISO(a.created_at), 'dd/MM HH:mm')} · {a.user_name}
              </span>
            </div>
            {diffs.length > 0 ? (
              <ul className="text-muted-foreground list-disc pl-4 space-y-0.5">
                {diffs.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
