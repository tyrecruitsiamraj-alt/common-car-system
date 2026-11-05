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
  defaultView?: View;
  /** แสดงป้ายแกน x ทุกกี่จุด */
  tickEvery?: number;
  /** ไม่แสดงป้ายของจุดที่เป็น 0 ใช้กับกราฟจุดถี่ เพื่อไม่ให้เลข 0 บังค่าจริง */
  hideZeroLabels?: boolean;
  /** กว้างขั้นต่ำของกราฟ ถ้าเกินความกว้างการ์ดจะเลื่อนแนวนอนได้ */
  minWidth?: number;
  onPointClick?: (index: number) => void;
  headerAction?: React.ReactNode;
};

type View = 'line' | 'bar';

const SERIES_COLOR = '#2a78d6';
const LABEL_INK = '#475569';
const CHART_MARGIN = { left: 0, right: 12, top: 22, bottom: 0 };

const chartConfig = { count: { label: 'จำนวนการลา', color: SERIES_COLOR } };

type DotProps = { cx?: number; cy?: number; index?: number };
type ChartClickState = { activeTooltipIndex?: number } | null;

const LeaveTrendChart: React.FC<Props> = ({
  title,
  subtitle,
  data,
  loading,
  defaultView = 'line',
  tickEvery = 1,
  hideZeroLabels,
  minWidth,
  onPointClick,
  headerAction,
}) => {
  const [view, setView] = useState<View>(defaultView);
  const total = data.reduce((sum, p) => sum + p.count, 0);
  const peakIndex = findPeakIndex(data);
  const peak = peakIndex >= 0 ? data[peakIndex] : null;
  const dense = data.length > 12;

  /** จุดสูงสุดใหญ่กว่าจุดอื่น เพื่อเน้นค่าสูงสุดโดยไม่ต้องอาศัยสี */
  const renderDot = ({ cx, cy, index }: DotProps) => (
    <circle
      key={index}
      cx={cx}
      cy={cy}
      r={index === peakIndex ? 6 : dense ? 2.5 : 4}
      fill={SERIES_COLOR}
      stroke="#ffffff"
      strokeWidth={dense && index !== peakIndex ? 1 : 2}
    />
  );

  const labelFormatter = hideZeroLabels ? (value: unknown) => (Number(value) > 0 ? String(value) : '') : undefined;

  const handleChartClick = (state: ChartClickState) => {
    const index = state?.activeTooltipIndex;
    if (typeof index === 'number' && index >= 0) onPointClick?.(index);
  };

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval={tickEvery - 1} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
    </>
  );

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {headerAction}
            {!loading && peak ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                สูงสุด {peak.label} · {peak.count} รายการ
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : total}</p>
          <div className="inline-flex rounded-full bg-slate-100 p-0.5 gap-0.5">
            {(['line', 'bar'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  'whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors',
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
        <div className="overflow-x-auto">
          <div style={minWidth ? { minWidth } : undefined}>
            <ChartContainer
              config={chartConfig}
              className={cn('h-56 w-full aspect-auto mt-3', onPointClick && '[&_svg]:cursor-pointer')}
            >
              {view === 'line' ? (
                <LineChart data={data} margin={CHART_MARGIN} onClick={onPointClick ? handleChartClick : undefined}>
                  {axes}
                  <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={renderDot}>
                    <LabelList
                      dataKey="count"
                      position="top"
                      offset={10}
                      fontSize={11}
                      fill={LABEL_INK}
                      formatter={labelFormatter}
                    />
                  </Line>
                </LineChart>
              ) : (
                <BarChart data={data} margin={CHART_MARGIN} onClick={onPointClick ? handleChartClick : undefined}>
                  {axes}
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {data.map((point, index) => (
                      <Cell key={point.label} fill={SERIES_COLOR} fillOpacity={index === peakIndex ? 1 : 0.55} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      fontSize={11}
                      fill={LABEL_INK}
                      formatter={labelFormatter}
                    />
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTrendChart;
