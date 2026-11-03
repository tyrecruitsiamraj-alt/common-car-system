import React from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { JOB_TYPE_COLORS } from '@/components/dashboard/analytics/DashboardChartSection';
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

type Props = {
  series: DashboardJobTypeTrendPoint[];
  loading?: boolean;
};

const DashboardJobTypeTrendChart: React.FC<Props> = ({ series, loading }) => {
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
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">แนวโน้มงานรายวันแยกตามประเภท</h3>
          <p className="text-xs text-slate-500 mt-0.5">จำนวนใบจองต่อวัน แยกสีตามประเภทงาน</p>
        </div>
        <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : total}</p>
      </div>
      {loading ? (
        <div className="h-72 flex items-center justify-center text-sm text-slate-500">กำลังโหลด…</div>
      ) : activeTypes.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-slate-500">ไม่มีข้อมูลในช่วงนี้</div>
      ) : (
        <ChartContainer config={config} className="h-72 w-full aspect-auto">
          <LineChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
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
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
};

export default DashboardJobTypeTrendChart;
