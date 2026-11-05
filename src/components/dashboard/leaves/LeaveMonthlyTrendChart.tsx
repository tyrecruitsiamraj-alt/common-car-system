import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { findPeakIndex } from '@/lib/leaveDashboard';
import { cn } from '@/lib/utils';

type Point = { label: string; count: number };

type Props = {
  title: string;
  subtitle: string;
  data: Point[];
  loading?: boolean;
};

type View = 'line' | 'bar';

const SERIES_COLOR = '#2a78d6';
const LABEL_INK = '#475569';
const CHART_MARGIN = { left: 0, right: 12, top: 22, bottom: 0 };

const chartConfig = { count: { label: 'จำนวนการลา', color: SERIES_COLOR } };

type DotProps = { cx?: number; cy?: number; index?: number };

const LeaveMonthlyTrendChart: React.FC<Props> = ({ title, subtitle, data, loading }) => {
  const [view, setView] = useState<View>('line');
  const total = data.reduce((sum, p) => sum + p.count, 0);
  const peakIndex = findPeakIndex(data);
  const peak = peakIndex >= 0 ? data[peakIndex] : null;

  /** จุดสูงสุดใหญ่กว่าจุดอื่น เพื่อเน้นค่าสูงสุดโดยไม่ต้องอาศัยสี */
  const renderDot = ({ cx, cy, index }: DotProps) => (
    <circle
      key={index}
      cx={cx}
      cy={cy}
      r={index === peakIndex ? 6 : 4}
      fill={SERIES_COLOR}
      stroke="#ffffff"
      strokeWidth={2}
    />
  );

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          {!loading && peak ? (
            <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              สูงสุด {peak.label} · {peak.count} รายการ
            </span>
          ) : null}
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
      ) : (
        <ChartContainer config={chartConfig} className="h-56 w-full aspect-auto mt-3">
          {view === 'line' ? (
            <LineChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={renderDot}>
                <LabelList dataKey="count" position="top" offset={10} fontSize={11} fill={LABEL_INK} />
              </Line>
            </LineChart>
          ) : (
            <BarChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {data.map((point, index) => (
                  <Cell key={point.label} fill={SERIES_COLOR} fillOpacity={index === peakIndex ? 1 : 0.55} />
                ))}
                <LabelList dataKey="count" position="top" fontSize={11} fill={LABEL_INK} />
              </Bar>
            </BarChart>
          )}
        </ChartContainer>
      )}
    </div>
  );
};

export default LeaveMonthlyTrendChart;
