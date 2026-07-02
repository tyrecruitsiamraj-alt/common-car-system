import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardKpi } from '@/lib/dashboard/types';

type Props = {
  kpi: DashboardKpi;
  loading?: boolean;
};

const DashboardKpiCard: React.FC<Props> = ({ kpi, loading }) => {
  const trend = kpi.trend;
  const TrendIcon =
    trend?.direction === 'up' ? ArrowUpRight : trend?.direction === 'down' ? ArrowDownRight : Minus;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {loading ? '…' : kpi.value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p>
      {trend && !loading ? (
        <div
          className={cn(
            'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            trend.direction === 'up' && 'bg-emerald-50 text-emerald-700',
            trend.direction === 'down' && 'bg-red-50 text-red-700',
            trend.direction === 'neutral' && 'bg-slate-100 text-slate-600',
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {trend.value}% {trend.label}
        </div>
      ) : null}
    </div>
  );
};

export default DashboardKpiCard;
