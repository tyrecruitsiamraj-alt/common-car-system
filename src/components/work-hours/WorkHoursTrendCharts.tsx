import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { workHoursTrendMonthLabel, type WorkHoursTrendPoint } from '@/lib/workHoursConfig';

const currency = (n: number) => `${n.toLocaleString('th-TH')} บาท`;

const hoursConfig = {
  total_normal_hours: { label: 'ชั่วโมงทำงาน', color: '#8b5cf6' },
  total_ot_hours: { label: 'ชั่วโมง OT', color: '#ec4899' },
};

const statusConfig = {
  active_count: { label: 'วิ่งงาน', color: '#22c55e' },
  idle_count: { label: 'ว่าง', color: '#94a3b8' },
};

const avgConfig = {
  avg_hours_per_day: { label: 'ชม./วัน เฉลี่ย', color: '#2563eb' },
};

const COST_COLORS = ['#f59e0b', '#2563eb', '#22c55e', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#a855f7', '#0ea5e9', '#f97316', '#14b8a6'];

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

type Props = {
  trend: WorkHoursTrendPoint[];
  loading?: boolean;
  employeeScoped?: boolean;
  threshold?: number;
};

const WorkHoursTrendCharts: React.FC<Props> = ({ trend, loading, employeeScoped, threshold }) => {
  const data = trend.map((t) => ({ ...t, label: workHoursTrendMonthLabel(t.month) }));
  const totalOtCost = trend.reduce((s, t) => s + t.estimated_ot_cost, 0);
  const costData = data
    .filter((t) => t.estimated_ot_cost > 0)
    .map((t, i) => ({ name: t.label, value: t.estimated_ot_cost, fill: COST_COLORS[i % COST_COLORS.length] }));

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm h-72 flex items-center justify-center text-sm text-slate-500">
            กำลังโหลด…
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard
        title="ชั่วโมงทำงานรวมรายเดือน"
        subtitle={`ชั่วโมงทำงานปกติ vs OT ${employeeScoped ? 'ของพนักงานคนนี้' : 'ของพนักงานทุกคน'}`}
      >
        <ChartContainer config={hoursConfig} className="h-64 w-full aspect-auto">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="total_normal_hours" stackId="hours" fill="var(--color-total_normal_hours)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="total_ot_hours" stackId="hours" fill="var(--color-total_ot_hours)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      {employeeScoped ? (
        <ChartCard title="ชั่วโมงเฉลี่ยต่อวัน" subtitle={`เทียบเกณฑ์ชั่วโมงเต็มเวลา ${threshold ?? '-'} ชม./วัน`}>
          <ChartContainer config={avgConfig} className="h-64 w-full aspect-auto">
            <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {threshold !== undefined ? (
                <ReferenceLine y={threshold} stroke="#f59e0b" strokeDasharray="4 4" />
              ) : null}
              <Line
                type="monotone"
                dataKey="avg_hours_per_day"
                stroke="var(--color-avg_hours_per_day)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>
      ) : (
        <ChartCard title="สถานะพนักงานรายเดือน" subtitle="วิ่งงาน (เกินเกณฑ์) vs ว่าง (ไม่เกินเกณฑ์)">
          <ChartContainer config={statusConfig} className="h-64 w-full aspect-auto">
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="active_count" fill="var(--color-active_count)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="idle_count" fill="var(--color-idle_count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </ChartCard>
      )}

      <ChartCard title="สัดส่วนค่า OT โดยประมาณ" subtitle={`รวม ${currency(totalOtCost)} ในช่วงที่แสดง`}>
        {costData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-500">ไม่มีค่า OT ในช่วงนี้</div>
        ) : (
          <ChartContainer config={{}} className="h-64 w-full aspect-auto">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-medium tabular-nums">{currency(Number(value))}</span>
                      </div>
                    )}
                  />
                }
              />
              <Pie data={costData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {costData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        {costData.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {costData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                {entry.name}
              </div>
            ))}
          </div>
        ) : null}
      </ChartCard>
    </div>
  );
};

export default WorkHoursTrendCharts;
