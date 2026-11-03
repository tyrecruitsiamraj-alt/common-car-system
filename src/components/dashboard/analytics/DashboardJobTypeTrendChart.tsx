import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { JOB_TYPE_COLORS } from '@/lib/dashboard/jobTypeColors';
import { BOOKING_JOB_TYPE_LABELS } from '@/lib/bookingUiMessages';
import type { DashboardJobTypeTrendPoint } from '@/lib/dashboard/types';

const JOB_TYPE_ORDER: (keyof Omit<DashboardJobTypeTrendPoint, 'label' | 'dateLabel'>)[] = [
  'trip_sabuy',
  'job_order',
  'substitute',
  'standby',
  'unspecified',
];

const JOB_TYPE_LABELS: Record<string, string> = {
  ...BOOKING_JOB_TYPE_LABELS,
  unspecified: 'ไม่ระบุ',
};

type View = 'line' | 'bar';

type Props = {
  series: DashboardJobTypeTrendPoint[];
  loading?: boolean;
};

const DashboardJobTypeTrendChart: React.FC<Props> = ({ series, loading }) => {
  const [view, setView] = useState<View>('line');
  const activeTypes = JOB_TYPE_ORDER.filter((type) => series.some((p) => p[type] > 0));

  const config = Object.fromEntries(
    activeTypes.map((type) => [type, { label: JOB_TYPE_LABELS[type], color: JOB_TYPE_COLORS[type] }]),
  );

  const total = series.reduce(
    (sum, p) => sum + activeTypes.reduce((s, type) => s + p[type], 0),
    0,
  );

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">แนวโน้มงานรายวันแยกตามประเภท</h3>
          <p className="text-xs text-slate-500 mt-0.5">จำนวนใบจองต่อวัน แยกสีตามประเภทงาน</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : total}</p>
          <div className="inline-flex rounded-full bg-slate-100 p-0.5 gap-0.5">
            {(['line', 'bar'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors',
                  view === v ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {v === 'line' ? 'แบบเส้น' : 'แบบแท่ง'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {loading ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-500">กำลังโหลด…</div>
      ) : activeTypes.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-500">ไม่มีข้อมูลในช่วงนี้</div>
      ) : (
        <ChartContainer config={config} className="h-56 w-full aspect-auto mt-3">
          {view === 'line' ? (
            <LineChart data={series} margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                interval={Math.max(0, Math.ceil(series.length / 7) - 1)}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {activeTypes.map((type) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  stroke={`var(--color-${type})`}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                >
                  <LabelList dataKey={type} position="top" fontSize={10} fill={`var(--color-${type})`} />
                </Line>
              ))}
            </LineChart>
          ) : (
            <BarChart data={series} margin={{ left: 0, right: 8, top: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                interval={Math.max(0, Math.ceil(series.length / 7) - 1)}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {activeTypes.map((type) => (
                <Bar key={type} dataKey={type} fill={`var(--color-${type})`} radius={[3, 3, 0, 0]} maxBarSize={14}>
                  <LabelList dataKey={type} position="top" fontSize={10} fill={`var(--color-${type})`} />
                </Bar>
              ))}
            </BarChart>
          )}
        </ChartContainer>
      )}
    </div>
  );
};

export default DashboardJobTypeTrendChart;
