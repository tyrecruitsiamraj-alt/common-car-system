import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  GOOD_SCORE_THRESHOLD,
  SATISFACTION_CRITERIA,
  type CriteriaDistributionPoint,
  type CriterionAverage,
  type SatisfactionTrendPoint,
} from '@/lib/satisfactionDashboardStats';

const CRITERIA_COLORS: Record<string, string> = {
  courtesy_score: '#2563eb',
  safety_score: '#ec4899',
  cleanliness_score: '#8b5cf6',
  punctuality_score: '#f59e0b',
};

const trendConfig = Object.fromEntries(
  SATISFACTION_CRITERIA.map((c) => [c.key, { label: c.label, color: CRITERIA_COLORS[c.key] }]),
);

const SCORE_BAND_COLORS: Record<number, string> = {
  5: '#22c55e',
  4: '#84cc16',
  3: '#f59e0b',
  2: '#f97316',
  1: '#ef4444',
};

function toneColor(average: number | null): string {
  if (average === null) return '#94a3b8';
  if (average >= GOOD_SCORE_THRESHOLD) return '#22c55e';
  if (average >= 3) return '#f59e0b';
  return '#ef4444';
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function LoadingGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm h-72 flex items-center justify-center text-sm text-slate-500"
        >
          กำลังโหลด…
        </div>
      ))}
    </div>
  );
}

type Props = {
  trend: SatisfactionTrendPoint[];
  criteriaAverages: CriterionAverage[];
  distribution: CriteriaDistributionPoint[];
  loading?: boolean;
};

const SatisfactionTrendCharts: React.FC<Props> = ({ trend, criteriaAverages, distribution, loading }) => {
  if (loading) return <LoadingGrid count={3} />;
  if (trend.every((t) => t.count === 0)) return null;

  const compareData = criteriaAverages.map((c) => ({ label: c.label, average: c.average ?? 0, fill: toneColor(c.average) }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="แนวโน้มคะแนนเฉลี่ยรายเดือน (แยกตามหัวข้อ)"
        subtitle={`เส้นประ = เกณฑ์ "ดี" (${GOOD_SCORE_THRESHOLD} คะแนน) — เส้นไหนอยู่ใต้เกณฑ์คือจุดที่ควรปรับปรุง`}
      >
        <ChartContainer config={trendConfig} className="h-72 w-full aspect-auto">
          <LineChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis domain={[0, 5]} tickLine={false} axisLine={false} fontSize={12} width={24} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine y={GOOD_SCORE_THRESHOLD} stroke="#f59e0b" strokeDasharray="4 4" />
            {SATISFACTION_CRITERIA.map((c) => (
              <Line
                key={c.key}
                type="monotone"
                dataKey={c.key}
                stroke={`var(--color-${c.key})`}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ChartContainer>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {SATISFACTION_CRITERIA.map((c) => (
            <div key={c.key} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CRITERIA_COLORS[c.key] }} />
              {c.label}
            </div>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="เปรียบเทียบคะแนนเฉลี่ยแต่ละหัวข้อ" subtitle="ช่วงเวลาที่เลือก — เขียว ≥ 4 (ดี), ส้ม 3-4, แดง < 3 (ควรปรับปรุง)">
        <ChartContainer config={{}} className="h-72 w-full aspect-auto">
          <BarChart data={compareData} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 5]} tickLine={false} axisLine={false} fontSize={12} />
            <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={11} width={140} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine x={GOOD_SCORE_THRESHOLD} stroke="#f59e0b" strokeDasharray="4 4" />
            <Bar dataKey="average" radius={[0, 4, 4, 0]}>
              {compareData.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="การกระจายคะแนนแต่ละหัวข้อ" subtitle="จำนวนครั้งที่ได้แต่ละคะแนน (1-5) ของแต่ละหัวข้อ">
        <ChartContainer config={{}} className="h-72 w-full aspect-auto">
          <BarChart data={distribution} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="criterion" tickLine={false} axisLine={false} fontSize={11} interval={0} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {[5, 4, 3, 2, 1].map((score) => (
              <Bar key={score} dataKey={score} stackId="dist" fill={SCORE_BAND_COLORS[score]} name={`${score} คะแนน`} />
            ))}
          </BarChart>
        </ChartContainer>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {[5, 4, 3, 2, 1].map((score) => (
            <div key={score} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SCORE_BAND_COLORS[score] }} />
              {score} คะแนน
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};

export default SatisfactionTrendCharts;
