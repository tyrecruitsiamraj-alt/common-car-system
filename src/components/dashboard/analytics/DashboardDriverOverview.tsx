import React from 'react';
import type { DashboardDriverSlice } from '@/lib/dashboard/types';

type Props = {
  drivers: DashboardDriverSlice[];
  loading?: boolean;
};

const DashboardDriverOverview: React.FC<Props> = ({ drivers, loading }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm text-sm text-slate-500">
        กำลังโหลดภาพรวมผู้ขับ…
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm text-sm text-slate-500">
        ยังไม่มีข้อมูลผู้ขับในช่วงที่เลือก
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">ภาระงานต่อผู้ขับ</h3>
        <p className="text-xs text-slate-500 mt-0.5">ใครรับงานมากที่สุดในช่วงที่เลือก</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {drivers.map((d) => (
          <div key={d.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{d.name}</p>
                <p className="text-xs text-slate-500 truncate">{d.subtitle}</p>
              </div>
              <span className="text-xs font-medium text-slate-500 shrink-0">{d.share}%</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold text-slate-900 tabular-nums">{d.taskCount}</p>
                <p className="text-[10px] text-slate-500">งาน</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-emerald-700 tabular-nums">{d.completedCount}</p>
                <p className="text-[10px] text-slate-500">สำเร็จ</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-red-600 tabular-nums">{d.overdueCount}</p>
                <p className="text-[10px] text-slate-500">ล่าช้า</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardDriverOverview;
