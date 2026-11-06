import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis, type TooltipProps } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
  LEAVE_TYPES,
  LEAVE_TYPE_COLORS,
  findPeakIndex,
  type LeaveTrendPoint,
  type LeaveType,
} from '@/lib/leaveDashboard';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle: string;
  data: LeaveTrendPoint[];
  loading?: boolean;
  defaultView?: View;
  /** แสดงป้ายแกน x ทุกกี่จุด */
  tickEvery?: number;
  /** ไม่แสดงป้ายยอดรวมที่เป็น 0 ใช้กับกราฟจุดถี่ เพื่อไม่ให้เลข 0 บังค่าจริง */
  hideZeroLabels?: boolean;
  /** กว้างขั้นต่ำของกราฟ ถ้าเกินความกว้างการ์ดจะเลื่อนแนวนอนได้ */
  minWidth?: number;
  onPointClick?: (index: number) => void;
  headerAction?: React.ReactNode;
};

type View = 'line' | 'bar';

/** คีย์ภาษาอังกฤษสำหรับ recharts เพราะชื่อประเภทมีช่องว่างและภาษาไทย ใช้เป็นชื่อ CSS variable ไม่ได้ */
const SERIES = LEAVE_TYPES.map((type, i) => ({ key: `t${i}`, type, color: LEAVE_TYPE_COLORS[type] }));

const chartConfig = Object.fromEntries(SERIES.map((s) => [s.key, { label: s.type, color: s.color }]));

const LABEL_INK = '#475569';
const CHART_MARGIN = { left: 0, right: 12, top: 22, bottom: 0 };

type ChartRow = { label: string; visibleTotal: number } & Record<string, number | string>;
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
  const [hidden, setHidden] = useState<ReadonlySet<LeaveType>>(new Set());

  const typeTotals = useMemo(
    () => new Map(SERIES.map((s) => [s.type, data.reduce((sum, p) => sum + p.byType[s.type], 0)])),
    [data],
  );
  const visible = SERIES.filter((s) => !hidden.has(s.type));
  /** ประเภทที่ยอดเป็น 0 ทั้งช่วงไม่ต้องวาด เพราะจะเป็นเส้นทับกันที่ 0 */
  const drawn = visible.filter((s) => (typeTotals.get(s.type) ?? 0) > 0);

  const rows: ChartRow[] = data.map((p) => ({
    label: p.label,
    visibleTotal: visible.reduce((sum, s) => sum + p.byType[s.type], 0),
    ...Object.fromEntries(SERIES.map((s) => [s.key, p.byType[s.type]])),
  }));

  const total = rows.reduce((sum, r) => sum + r.visibleTotal, 0);
  const peakIndex = findPeakIndex(rows.map((r) => ({ count: r.visibleTotal })));
  const peak = peakIndex >= 0 ? rows[peakIndex] : null;
  const dense = data.length > 12;

  const toggleType = (type: LeaveType) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const totalLabelFormatter = (value: unknown) => (hideZeroLabels && !(Number(value) > 0) ? '' : String(value));

  const handleChartClick = (state: ChartClickState) => {
    const index = state?.activeTooltipIndex;
    if (typeof index === 'number' && index >= 0) onPointClick?.(index);
  };

  const renderTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    const row = payload?.[0]?.payload as ChartRow | undefined;
    if (!active || !row) return null;
    const nonZero = visible.filter((s) => Number(row[s.key]) > 0);
    return (
      <div className="min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-slate-900">
          {label} · รวม {row.visibleTotal} รายการ
        </p>
        {nonZero.length === 0 ? (
          <p className="mt-1 text-slate-500">ไม่มีรายการลา</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {nonZero.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600">{s.type}</span>
                <span className="ml-auto pl-3 font-medium text-slate-900 tabular-nums">{row[s.key]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval={tickEvery - 1} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
      <ChartTooltip content={renderTooltip} />
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
                สูงสุด {peak.label} · {peak.visibleTotal} รายการ
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
        <>
          <div className="overflow-x-auto">
            <div style={minWidth ? { minWidth } : undefined}>
              <ChartContainer
                config={chartConfig}
                className={cn('h-56 w-full aspect-auto mt-3', onPointClick && '[&_svg]:cursor-pointer')}
              >
                {view === 'line' ? (
                  <LineChart data={rows} margin={CHART_MARGIN} onClick={onPointClick ? handleChartClick : undefined}>
                    {axes}
                    {drawn.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.type}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={dense ? false : { r: 3.5, fill: s.color, stroke: '#ffffff', strokeWidth: 1.5 }}
                        activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={rows} margin={CHART_MARGIN} onClick={onPointClick ? handleChartClick : undefined}>
                    {axes}
                    {drawn.map((s, i) => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.type}
                        stackId="leave"
                        fill={s.color}
                        stroke="#ffffff"
                        strokeWidth={1}
                        maxBarSize={32}
                      >
                        {i === drawn.length - 1 ? (
                          <LabelList
                            dataKey="visibleTotal"
                            position="top"
                            fontSize={11}
                            fill={LABEL_INK}
                            formatter={totalLabelFormatter}
                          />
                        ) : null}
                      </Bar>
                    ))}
                  </BarChart>
                )}
              </ChartContainer>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="ประเภทการลาในกราฟ กดเพื่อซ่อนหรือแสดง">
            {SERIES.map((s) => {
              const isHidden = hidden.has(s.type);
              const count = typeTotals.get(s.type) ?? 0;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleType(s.type)}
                  aria-pressed={!isHidden}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-colors',
                    isHidden
                      ? 'border-dashed border-slate-300 bg-white text-slate-400'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: isHidden ? 'transparent' : s.color, border: `1.5px solid ${s.color}` }}
                  />
                  <span className={cn(isHidden && 'line-through')}>{s.type}</span>
                  <span className="tabular-nums text-slate-500">{count}</span>
                </button>
              );
            })}
            {hidden.size > 0 ? (
              <button
                type="button"
                onClick={() => setHidden(new Set())}
                className="px-2 py-1 text-[11px] font-semibold text-slate-600 underline-offset-2 hover:underline"
              >
                แสดงทุกประเภท
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default LeaveTrendChart;
