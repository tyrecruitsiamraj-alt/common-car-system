import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Loader2, Pencil } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import DashboardPaginationFooter from '@/components/dashboard/analytics/DashboardPaginationFooter';
import ComplaintCaseEditDialog from '@/components/dashboard/complaints/ComplaintCaseEditDialog';
import { useServerPagedReport } from '@/hooks/useServerPagedReport';
import { cn } from '@/lib/utils';
import type { Complaint } from '@/types';

const PAGE_SIZE = 10;

type Props = {
  onCaseUpdated?: () => void;
};

function formatComplaintDate(ymd: string): string {
  try {
    return format(parseISO(ymd), 'd MMM yyyy', { locale: th });
  } catch {
    return ymd;
  }
}

const ComplaintCaseTable: React.FC<Props> = ({ onCaseUpdated }) => {
  const { rows, total, totalPages, page, setPage, loading, refetch } = useServerPagedReport<Complaint>(
    '/api/complaints',
    {},
    PAGE_SIZE,
  );
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const openEdit = (c: Complaint) => {
    setEditing(c);
    setEditOpen(true);
  };

  const handleSaved = () => {
    refetch();
    onCaseUpdated?.();
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">รายการเรื่องร้องเรียน</h3>
        <p className="text-xs text-slate-500 mt-0.5">เรียงจากเรื่องล่าสุดก่อน</p>
      </div>

      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="whitespace-nowrap">วันที่ร้องเรียน</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead className="hidden md:table-cell">หมวดหมู่</TableHead>
              <TableHead className="hidden lg:table-cell">ประเภทการร้องเรียน</TableHead>
              <TableHead>สถานะพนักงาน</TableHead>
              <TableHead className="hidden sm:table-cell">บทลงโทษ</TableHead>
              <TableHead className="text-right">แก้ไข</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(loading && rows.length > 0 && 'opacity-50')}>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  กำลังโหลด…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  ยังไม่มีเรื่องร้องเรียน
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap text-slate-900">{formatComplaintDate(c.complaint_date)}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-900">{c.driver_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600">{c.category || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[12rem] truncate text-slate-600">
                    {c.complaint_type || '—'}
                  </TableCell>
                  <TableCell className="text-slate-600">{c.employee_status || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell text-slate-600">{c.penalty || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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

      <ComplaintCaseEditDialog
        caseData={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default ComplaintCaseTable;
