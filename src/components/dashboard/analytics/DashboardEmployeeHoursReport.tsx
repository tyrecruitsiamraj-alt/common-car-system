import React from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
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

type EmployeeHoursRow = {
  key: string;
  employeeId: string;
  employeeName: string;
  dateYmd: string;
  tripCount: number;
  plannedHours: number;
  actualHours: number;
  diffHours: number;
};

type Props = {
  fromIso: string;
  toIso: string;
  ownerId?: string;
  vehicleId?: string;
  search?: string;
  status?: string;
};

function formatHours(h: number): string {
  return `${h.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ชม.`;
}

function formatDiff(h: number): string {
  const sign = h > 0 ? '+' : '';
  return `${sign}${h.toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ชม.`;
}

function formatDateLabel(dateYmd: string): string {
  try {
    return format(parseISO(dateYmd), 'd MMM yyyy', { locale: th });
  } catch {
    return dateYmd;
  }
}

const DashboardEmployeeHoursReport: React.FC<Props> = ({ fromIso, toIso, ownerId, vehicleId, search, status }) => {
  const { rows, total, totalPages, page, setPage, loading } = useServerPagedReport<EmployeeHoursRow>(
    '/api/dashboard-reports',
    { report: 'employee_hours', from: fromIso, to: toIso, ownerId, vehicleId, search, status },
    PAGE_SIZE,
  );

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">ชั่วโมงทำงานรายวัน — จริงเทียบกับที่คาดการณ์</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          คาดการณ์ = เวลาเริ่ม–สิ้นสุดตามที่จอง · จริง = เวลาเริ่ม–เวลาปิดงานจริง (ถ้ายังไม่ปิดงานใช้เวลาที่จองไว้)
        </p>
      </div>

      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="whitespace-nowrap">วันที่</TableHead>
              <TableHead>พนักงาน</TableHead>
              <TableHead className="text-right">เที่ยว</TableHead>
              <TableHead className="text-right">คาดการณ์</TableHead>
              <TableHead className="text-right">เวลาจริง</TableHead>
              <TableHead className="text-right">ผลต่าง</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(loading && rows.length > 0 && 'opacity-50')}>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  กำลังโหลด…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  ไม่มีข้อมูลชั่วโมงทำงานในช่วงที่เลือก
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="whitespace-nowrap text-slate-900">{formatDateLabel(r.dateYmd)}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-900">{r.employeeName}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-600">{r.tripCount}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-600">{formatHours(r.plannedHours)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-slate-900">
                    {formatHours(r.actualHours)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums font-medium',
                      r.diffHours > 0 ? 'text-amber-600' : r.diffHours < 0 ? 'text-emerald-600' : 'text-slate-400',
                    )}
                  >
                    {r.diffHours === 0 ? '—' : formatDiff(r.diffHours)}
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

export default DashboardEmployeeHoursReport;
