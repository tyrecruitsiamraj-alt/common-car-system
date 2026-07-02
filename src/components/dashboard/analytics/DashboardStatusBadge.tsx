import React from 'react';
import { cn } from '@/lib/utils';
import type { DashboardSlaStatus, DashboardTaskStatus } from '@/lib/dashboard/types';
import { STATUS_LABELS } from '@/lib/dashboard/buildDashboardData';

const STATUS_STYLES: Record<DashboardTaskStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 ring-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  overdue: 'bg-red-50 text-red-700 ring-red-200',
  cancelled: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
  at_risk: 'bg-amber-50 text-amber-800 ring-amber-200',
};

const SLA_STYLES: Record<DashboardSlaStatus, string> = {
  on_track: 'bg-emerald-50 text-emerald-700',
  at_risk: 'bg-amber-50 text-amber-800',
  breached: 'bg-red-50 text-red-700',
};

const SLA_LABELS: Record<DashboardSlaStatus, string> = {
  on_track: 'ตาม SLA',
  at_risk: 'เสี่ยง',
  breached: 'เกิน SLA',
};

type Props = {
  status: DashboardTaskStatus;
  className?: string;
};

export function DashboardStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function DashboardSlaBadge({ status, className }: { status: DashboardSlaStatus; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium', SLA_STYLES[status], className)}>
      {SLA_LABELS[status]}
    </span>
  );
}
