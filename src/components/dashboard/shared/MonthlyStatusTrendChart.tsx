import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import type { MonthlyStatusPoint } from '@/lib/caseReportStats';

type Props = {
  title: string;
  subtitle: string;
  data: MonthlyStatusPoint[];
  loading?: boolean;
};

const statusConfig = {
  wrong: { label: 'ฝ่ายผิด', color: '#dc2626' },
  right: { label: 'ฝ่ายถูก', color: '#059669' },
  excluded: { label: 'ไม่นับเคส', color: '#64748b' },
  total: { label: 'รวมทั้งหมด', color: '#2563eb' },
};

type View = 'line' | 'bar';

const MonthlyStatusTrendChart: React.FC<Props> = ({ title, subtitle, data, loading }) => {
  const [view, setView] = useState<View>('line');
  const totalCount = data.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : totalCount}</p>
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
      ) : (
        <ChartContainer config={statusConfig} className="h-56 w-full aspect-auto mt-3">
          {view === 'line' ? (
            <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="wrong" stroke="var(--color-wrong)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="right" stroke="var(--color-right)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="excluded" stroke="var(--color-excluded)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={2.5}
                strokeDasharray="5 3"
                dot={{ r: 3 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="wrong" fill="var(--color-wrong)" radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="right" fill="var(--color-right)" radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="excluded" fill="var(--color-excluded)" radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          )}
        </ChartContainer>
      )}
    </div>
  );
};

export default MonthlyStatusTrendChart;
