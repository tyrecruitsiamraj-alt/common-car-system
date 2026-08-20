import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { CategoryBucket } from '@/lib/accidentCasesReport';

/** สีตามลำดับหมวดหมู่คงที่ — ไม่หมุนสี ส่วนที่เกิน 6 อันดับถูกรวมเป็น "อื่นๆ" แล้วในข้อมูล (bucketTopCategories) */
const CATEGORY_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#4a3aa7',
  '#e34948',
];
const OTHER_COLOR = 'hsl(240 4% 65%)';

type Props = {
  title: string;
  subtitle: string;
  buckets: CategoryBucket[];
  loading?: boolean;
};

const AccidentBreakdownChart: React.FC<Props> = ({ title, subtitle, buckets, loading }) => {
  const barData = buckets.map((b, i) => ({
    name: b.label,
    count: b.count,
    fill: b.label === 'อื่นๆ' ? OTHER_COLOR : CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

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
      ) : barData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-500">ไม่มีข้อมูลในช่วงนี้</div>
      ) : (
        <ChartContainer config={{ count: { label: 'จำนวน', color: 'hsl(211 100% 50%)' } }} className="h-56 w-full aspect-auto">
          <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {barData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
};

export default AccidentBreakdownChart;
