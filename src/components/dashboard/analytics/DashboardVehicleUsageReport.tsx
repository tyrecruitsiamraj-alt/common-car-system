import React from 'react';
import type { DashboardVehicleUsageSlice } from '@/lib/dashboard/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Props = {
  vehicles: DashboardVehicleUsageSlice[];
  loading?: boolean;
};

const DashboardVehicleUsageReport: React.FC<Props> = ({ vehicles, loading }) => {
  const total = vehicles.reduce((sum, v) => sum + v.count, 0);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">รายงานการใช้งานรถ</h3>
          <p className="text-xs text-slate-500 mt-0.5">รถคันไหนถูกใช้งานกี่ครั้ง — เรียงจากใช้งานบ่อยสุด</p>
        </div>
        <p className="text-xs text-slate-500">{loading ? '…' : `${total} ครั้ง`}</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">อันดับ</TableHead>
              <TableHead>ทะเบียน</TableHead>
              <TableHead className="hidden sm:table-cell">รุ่น / ชื่อรถ</TableHead>
              <TableHead className="text-right">จำนวนครั้ง</TableHead>
              <TableHead className="w-40">สัดส่วน</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  กำลังโหลด…
                </TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  ไม่มีข้อมูลการใช้งานรถในช่วงที่เลือก
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v, i) => (
                <TableRow key={v.id}>
                  <TableCell className="text-slate-500 tabular-nums">{i + 1}</TableCell>
                  <TableCell className="font-medium text-slate-900 whitespace-nowrap">{v.plateNo}</TableCell>
                  <TableCell className="hidden sm:table-cell text-slate-600">{v.label}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-900 tabular-nums">{v.count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2a78d6]"
                          style={{ width: `${Math.min(100, Math.max(v.share, v.count > 0 ? 3 : 0))}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums w-9 text-right">{v.share}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DashboardVehicleUsageReport;
