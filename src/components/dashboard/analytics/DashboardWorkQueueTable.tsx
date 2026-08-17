import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Loader2, UserPlus } from 'lucide-react';
import { formatThaiDateTime } from '@/lib/thaiDateTimeFormat';
import { bookingToWorkItem } from '@/lib/dashboard/buildDashboardData';
import { DashboardSlaBadge, DashboardStatusBadge } from '@/components/dashboard/analytics/DashboardStatusBadge';
import DashboardPaginationFooter from '@/components/dashboard/analytics/DashboardPaginationFooter';
import { useServerPagedReport } from '@/hooks/useServerPagedReport';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Employee, Vehicle, VehicleBooking } from '@/types';

const PAGE_SIZE = 10;

type Props = {
  fromIso: string;
  toIso: string;
  ownerId?: string;
  vehicleId?: string;
  search?: string;
  status?: string;
  employees: Employee[];
  vehicles: Vehicle[];
};

const DashboardWorkQueueTable: React.FC<Props> = ({
  fromIso,
  toIso,
  ownerId,
  vehicleId,
  search,
  status,
  employees,
  vehicles,
}) => {
  const { rows: bookings, total, totalPages, page, setPage, loading } = useServerPagedReport<VehicleBooking>(
    '/api/dashboard-reports',
    { report: 'work_queue', from: fromIso, to: toIso, ownerId, vehicleId, search, status },
    PAGE_SIZE,
  );

  const rows = useMemo(
    () => bookings.map((b) => bookingToWorkItem(b, employees, vehicles)),
    [bookings, employees, vehicles],
  );

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">Work Queue</h3>
        <p className="text-xs text-slate-500 mt-0.5">รายการงานที่ต้องติดตาม — เรียงงานล่าช้าก่อน</p>
      </div>

      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="whitespace-nowrap">ใบงาน</TableHead>
              <TableHead>ผู้รับผิดชอบ</TableHead>
              <TableHead className="hidden md:table-cell">สถานที่</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="hidden lg:table-cell">SLA</TableHead>
              <TableHead className="hidden xl:table-cell">อัปเดตล่าสุด</TableHead>
              <TableHead className="hidden sm:table-cell">Next Action</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(loading && rows.length > 0 && 'opacity-50')}>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                  กำลังโหลด…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                  ไม่พบรายการตามตัวกรอง
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="min-w-[10rem]">
                    <p className="font-medium text-slate-900">{row.workOrderNo}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[12rem]">{row.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{row.vehiclePlate}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.ownerName}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[10rem] truncate">{row.site}</TableCell>
                  <TableCell>
                    <DashboardStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <DashboardSlaBadge status={row.slaStatus} />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-xs text-slate-500 whitespace-nowrap">
                    {formatThaiDateTime(row.updatedAt)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-slate-600">{row.nextAction}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                        <Link to="/fleet/monitor" title="ดูรายละเอียด">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                        <Link to="/fleet/bookings" title="มอบหมาย / จอง">
                          <UserPlus className="h-4 w-4" />
                        </Link>
                      </Button>
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

export default DashboardWorkQueueTable;
