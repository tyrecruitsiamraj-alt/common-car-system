import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardCancelReasonSlice } from '@/lib/dashboard/types';

/** สีตามลำดับหมวดหมู่คงที่ — ใช้สอง slot แรกจากลำดับเดียวกับ JOB_TYPE_COLORS */
const CANCEL_REASON_COLORS: Record<string, string> = {
  user_not_using: '#2a78d6',
  employee_no_show: '#eb6834',
  unspecified: 'hsl(240 4% 65%)',
};

type Props = {
  cancelReasonSlices: DashboardCancelReasonSlice[];
  loading?: boolean;
};

const DashboardCancelReasonChart: React.FC<Props> = ({ cancelReasonSlices, loading }) => {
  const cancelReasonBarData = cancelReasonSlices.map((s) => ({
    name: s.label,
    count: s.count,
    fill: CANCEL_REASON_COLORS[s.cancelReason] ?? 'hsl(211 100% 50%)',
  }));

  const totalCancelReason = cancelReasonSlices.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">สาเหตุการยกเลิก</h3>
          <p className="text-xs text-slate-500 mt-0.5">งานที่ถูกยกเลิกแยกตามเหตุผล</p>
        </div>
        <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : totalCancelReason}</p>
      </div>
      {loading ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-500">กำลังโหลด…</div>
      ) : cancelReasonBarData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-500">ไม่มีการยกเลิกในช่วงนี้</div>
      ) : (
        <ChartContainer config={{ count: { label: 'จำนวน', color: 'hsl(211 100% 50%)' } }} className="h-40 w-full aspect-auto">
          <BarChart data={cancelReasonBarData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={220} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {cancelReasonBarData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
};

export default DashboardCancelReasonChart;
