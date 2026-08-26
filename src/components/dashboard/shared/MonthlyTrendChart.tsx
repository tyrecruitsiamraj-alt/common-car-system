import React from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type Props = {
  title: string;
  subtitle: string;
  data: { label: string; count: number }[];
  loading?: boolean;
};

const trendConfig = {
  count: { label: 'จำนวนเคส', color: 'hsl(0 84% 60%)' },
};

const MonthlyTrendChart: React.FC<Props> = ({ title, subtitle, data, loading }) => {
  const total = data.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : total}</p>
      </div>
      {loading ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-500">กำลังโหลด…</div>
      ) : (
        <ChartContainer config={trendConfig} className="h-56 w-full aspect-auto">
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ChartContainer>
      )}
    </div>
  );
};

export default MonthlyTrendChart;
