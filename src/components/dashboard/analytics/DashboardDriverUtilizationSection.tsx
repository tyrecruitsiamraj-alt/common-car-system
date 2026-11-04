import React from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { DashboardDriverUtilization } from '@/lib/dashboard/types';

const ACCENT = '#2a78d6';
const TRACK = '#dbeafe';

type Props = {
  utilization: DashboardDriverUtilization;
  loading?: boolean;
};

const DashboardDriverUtilizationSection: React.FC<Props> = ({ utilization, loading }) => {
  const { totalDrivers, activeDrivers, share } = utilization;
  const idle = Math.max(totalDrivers - activeDrivers, 0);

  const pieData = [
    { name: 'วิ่งงานแล้ว', value: activeDrivers, fill: ACCENT },
    { name: 'ยังไม่วิ่งงาน', value: idle, fill: TRACK },
  ];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">% คนขับที่วิ่งงาน</h3>
        <p className="text-xs text-slate-500 mt-0.5">คนขับที่มีงาน ≥1 งาน จากคนขับ Common Driver ทั้งหมด (ไม่รวมพ้นสภาพ)</p>
      </div>
      {loading ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-500">กำลังโหลด…</div>
      ) : totalDrivers === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-500">ไม่มีข้อมูลคนขับ</div>
      ) : (
        <div className="flex items-center gap-4">
          <ChartContainer config={{ value: { label: 'จำนวน', color: ACCENT } }} className="h-44 w-44 shrink-0 aspect-auto">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={72}
                strokeWidth={2}
                stroke="#fff"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="min-w-0">
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{share}%</p>
            <p className="text-xs text-slate-500 tabular-nums">
              {activeDrivers} / {totalDrivers} คน
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: ACCENT }} />
                วิ่งงานแล้ว: {activeDrivers} คน
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: TRACK }} />
                ยังไม่วิ่งงาน: {idle} คน
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardDriverUtilizationSection;
