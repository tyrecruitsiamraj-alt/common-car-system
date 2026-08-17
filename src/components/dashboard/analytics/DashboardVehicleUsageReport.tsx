import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DashboardPaginationFooter from '@/components/dashboard/analytics/DashboardPaginationFooter';
import { useServerPagedReport } from '@/hooks/useServerPagedReport';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

type VehicleUsageRow = {
  id: string;
  plateNo: string;
  label: string;
  count: number;
  share: number;
};

type Props = {
  fromIso: string;
  toIso: string;
  ownerId?: string;
  vehicleId?: string;
  search?: string;
  status?: string;
};

const DashboardVehicleUsageReport: React.FC<Props> = ({ fromIso, toIso, ownerId, vehicleId, search, status }) => {
  const { rows, total, totalPages, page, setPage, loading } = useServerPagedReport<VehicleUsageRow>(
    '/api/dashboard-reports',
    { report: 'vehicle_usage', from: fromIso, to: toIso, ownerId, vehicleId, search, status },
    PAGE_SIZE,
  );

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">รายงานการใช้งานรถ</h3>
        <p className="text-xs text-slate-500 mt-0.5">รถคันไหนถูกใช้งานกี่ครั้ง — เรียงจากใช้งานบ่อยสุด</p>
      </div>

      <div className="relative overflow-x-auto">
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
          <TableBody className={cn(loading && rows.length > 0 && 'opacity-50')}>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  กำลังโหลด…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  ไม่มีข้อมูลการใช้งานรถในช่วงที่เลือก
                </TableCell>
              </TableRow>
            ) : (
              rows.map((v, i) => (
                <TableRow key={v.id}>
                  <TableCell className="text-slate-500 tabular-nums">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
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
        {loading && rows.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : null}
      </div>

      <DashboardPaginationFooter page={page} totalPages={totalPages} total={total} onPageChange={setPage} loading={loading} />
    </div>
  );
};

export default DashboardVehicleUsageReport;
