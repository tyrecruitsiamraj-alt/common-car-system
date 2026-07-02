import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, Eye, UserPlus } from 'lucide-react';
import { formatThaiDateTime } from '@/lib/thaiDateTimeFormat';
import type { DashboardSortDir, DashboardSortKey, DashboardWorkItem } from '@/lib/dashboard/types';
import { DashboardSlaBadge, DashboardStatusBadge } from '@/components/dashboard/analytics/DashboardStatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Props = {
  items: DashboardWorkItem[];
  loading?: boolean;
};

function sortItems(items: DashboardWorkItem[], key: DashboardSortKey, dir: DashboardSortDir) {
  const sorted = [...items].sort((a, b) => {
    if (key === 'priority') return a.priority - b.priority;
    if (key === 'ownerName') return a.ownerName.localeCompare(b.ownerName, 'th');
    if (key === 'status') return a.status.localeCompare(b.status);
    if (key === 'createdAt') return a.createdAt.localeCompare(b.createdAt);
    return a.updatedAt.localeCompare(b.updatedAt);
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

const DashboardWorkQueueTable: React.FC<Props> = ({ items, loading }) => {
  const [sortKey, setSortKey] = useState<DashboardSortKey>('priority');
  const [sortDir, setSortDir] = useState<DashboardSortDir>('asc');

  const rows = useMemo(() => sortItems(items, sortKey, sortDir), [items, sortKey, sortDir]);

  const toggleSort = (key: DashboardSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'priority' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Work Queue</h3>
          <p className="text-xs text-slate-500 mt-0.5">รายการงานที่ต้องติดตาม — เรียงงานล่าช้าก่อน</p>
        </div>
        <p className="text-xs text-slate-500">{loading ? '…' : `${rows.length} รายการ`}</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="whitespace-nowrap">ใบงาน</TableHead>
              <TableHead>
                <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('ownerName')}>
                  ผู้รับผิดชอบ <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="hidden md:table-cell">สถานที่</TableHead>
              <TableHead>
                <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('status')}>
                  สถานะ <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">SLA</TableHead>
              <TableHead className="hidden xl:table-cell">อัปเดตล่าสุด</TableHead>
              <TableHead className="hidden sm:table-cell">Next Action</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
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
      </div>
    </div>
  );
};

export default DashboardWorkQueueTable;
