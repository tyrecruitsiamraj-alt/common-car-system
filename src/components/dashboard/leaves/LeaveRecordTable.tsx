import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardPaginationFooter from '@/components/dashboard/analytics/DashboardPaginationFooter';
import { formatLeaveDate, leaveRecordName, type LeaveRecord } from '@/lib/leaveDashboard';

const PAGE_SIZE = 10;
const COLUMN_COUNT = 6;

type Props = {
  records: LeaveRecord[];
  loading?: boolean;
};

const LeaveRecordTable: React.FC<Props> = ({ records, loading }) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const visible = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">รายการลา</h3>
        <p className="text-xs text-slate-500 mt-0.5">เฉพาะพนักงาน Common เรียงจากวันที่ลาล่าสุดก่อน</p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="whitespace-nowrap">วันที่ลา</TableHead>
              <TableHead className="hidden sm:table-cell whitespace-nowrap">รหัสพนักงาน</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>ประเภทการลา</TableHead>
              <TableHead className="hidden md:table-cell">ชื่อนาย</TableHead>
              <TableHead className="hidden lg:table-cell">ชื่อคนแทน</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="h-24 text-center text-slate-500">
                  กำลังโหลด…
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="h-24 text-center text-slate-500">
                  ยังไม่มีรายการลาของพนักงาน Common
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-slate-900">{formatLeaveDate(r.date)}</TableCell>
                  <TableCell className="hidden sm:table-cell whitespace-nowrap text-slate-600 tabular-nums">
                    {r.employeeCode}
                  </TableCell>
                  <TableCell className="text-slate-900">
                    <span className="sm:whitespace-nowrap">{leaveRecordName(r)}</span>
                    {r.englishName ? null : (
                      <span className="ml-2 inline-flex whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        ไม่มีชื่ออังกฤษ
                      </span>
                    )}
                    {/* จอแคบไม่มีคอลัมน์รหัส จึงแสดงใต้ชื่อ เพื่อให้เห็นประเภทการลาโดยไม่ต้องเลื่อนตาราง */}
                    <span className="block sm:hidden text-xs text-slate-500 tabular-nums">{r.employeeCode}</span>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {r.leaveType}
                    {r.reason ? <span className="text-slate-500"> — {r.reason}</span> : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600">{r.supervisorName ?? '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-slate-600">{r.coverPersonName ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DashboardPaginationFooter
        page={page}
        totalPages={totalPages}
        total={records.length}
        onPageChange={setPage}
        loading={loading}
      />
    </div>
  );
};

export default LeaveRecordTable;
