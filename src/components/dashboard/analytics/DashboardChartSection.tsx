import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardJobTypeSlice, DashboardStatusSlice, DashboardTrendPoint } from '@/lib/dashboard/types';

const trendConfig = {
  value: { label: 'งานปัจจุบัน', color: 'hsl(211 100% 50%)' },
  previousValue: { label: 'ช่วงก่อน', color: 'hsl(215 16% 70%)' },
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'hsl(142 71% 45%)',
  in_progress: 'hsl(211 100% 50%)',
  pending: 'hsl(215 16% 65%)',
  overdue: 'hsl(0 84% 60%)',
  at_risk: 'hsl(38 92% 50%)',
  cancelled: 'hsl(240 4% 65%)',
};

/** สีตามลำดับหมวดหมู่คงที่ — ไม่หมุนสี (แยกแยะได้แม้ตาบอดสี ตรวจแล้วด้วย dataviz validator) */
const JOB_TYPE_COLORS: Record<string, string> = {
  trip_sabuy: '#2a78d6',
  job_order: '#eb6834',
  substitute: '#1baf7a',
  standby: '#eda100',
  unspecified: 'hsl(240 4% 65%)',
};

type Props = {
  trendSeries: DashboardTrendPoint[];
  statusSlices: DashboardStatusSlice[];
  jobTypeSlices: DashboardJobTypeSlice[];
  loading?: boolean;
};

const DashboardChartSection: React.FC<Props> = ({ trendSeries, statusSlices, jobTypeSlices, loading }) => {
  const barData = statusSlices.map((s) => ({
    name: s.label,
    count: s.count,
    fill: STATUS_COLORS[s.status] ?? 'hsl(211 100% 50%)',
  }));

  const jobTypeBarData = jobTypeSlices.map((s) => ({
    name: s.label,
    count: s.count,
    fill: JOB_TYPE_COLORS[s.jobType] ?? 'hsl(211 100% 50%)',
  }));

  const totalTrend = trendSeries.reduce((sum, p) => sum + p.value, 0);
  const totalStatus = statusSlices.reduce((sum, s) => sum + s.count, 0);
  const totalJobType = jobTypeSlices.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">แนวโน้มงานรายวัน</h3>
            <p className="text-xs text-slate-500 mt-0.5">จำนวนใบจองต่อวันในช่วงที่เลือก</p>
          </div>
          <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : totalTrend}</p>
        </div>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-slate-500">กำลังโหลด…</div>
        ) : (
          <ChartContainer config={trendConfig} className="h-56 w-full aspect-auto">
            <LineChart data={trendSeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="previousValue"
                stroke="var(--color-previousValue)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
              <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">งานตามสถานะ</h3>
            <p className="text-xs text-slate-500 mt-0.5">สัดส่วนงานใน Work Queue</p>
          </div>
          <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : totalStatus}</p>
        </div>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-slate-500">กำลังโหลด…</div>
        ) : barData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-slate-500">ไม่มีข้อมูลในช่วงนี้</div>
        ) : (
          <ChartContainer config={{ count: { label: 'จำนวน', color: 'hsl(211 100% 50%)' } }} className="h-56 w-full aspect-auto">
            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} fontSize={11} />
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

      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">งานตามประเภท</h3>
            <p className="text-xs text-slate-500 mt-0.5">ปริมาณการจองแยกตามประเภทงาน</p>
          </div>
          <p className="text-lg font-semibold text-slate-900 tabular-nums">{loading ? '…' : totalJobType}</p>
        </div>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-slate-500">กำลังโหลด…</div>
        ) : jobTypeBarData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-slate-500">ไม่มีข้อมูลในช่วงนี้</div>
        ) : (
          <ChartContainer config={{ count: { label: 'จำนวน', color: 'hsl(211 100% 50%)' } }} className="h-56 w-full aspect-auto">
            <BarChart data={jobTypeBarData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {jobTypeBarData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
};

export default DashboardChartSection;
