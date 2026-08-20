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
import AccidentCaseEditDialog from '@/components/dashboard/accidents/AccidentCaseEditDialog';
import { useServerPagedReport } from '@/hooks/useServerPagedReport';
import { cn } from '@/lib/utils';
import type { AccidentCase } from '@/types';

const PAGE_SIZE = 10;

type Props = {
  onCaseUpdated?: () => void;
};

function formatCaseDate(ymd: string): string {
  try {
    return format(parseISO(ymd), 'd MMM yyyy', { locale: th });
  } catch {
    return ymd;
  }
}

const AccidentCaseTable: React.FC<Props> = ({ onCaseUpdated }) => {
  const { rows, total, totalPages, page, setPage, loading, refetch } = useServerPagedReport<AccidentCase>(
    '/api/accident-cases',
    {},
    PAGE_SIZE,
  );
  const [editing, setEditing] = useState<AccidentCase | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const openEdit = (c: AccidentCase) => {
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
        <h3 className="text-sm font-semibold text-slate-900">รายการเคสอุบัติเหตุ</h3>
        <p className="text-xs text-slate-500 mt-0.5">เรียงจากเคสล่าสุดก่อน</p>
      </div>

      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="whitespace-nowrap">วันที่เกิดเคส</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead className="hidden md:table-cell">ประเภทอุบัติเหตุ</TableHead>
              <TableHead className="hidden lg:table-cell">สถานที่เกิดเหตุ</TableHead>
              <TableHead>สถานะเคส</TableHead>
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
                  ยังไม่มีเคสอุบัติเหตุ
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap text-slate-900">{formatCaseDate(c.case_date)}</TableCell>
                  <TableCell className="whitespace-nowrap text-slate-900">{c.employee_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-slate-600">{c.accident_type || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell max-w-[12rem] truncate text-slate-600">
                    {c.location_name || '—'}
                  </TableCell>
                  <TableCell className="text-slate-600">{c.case_status || '—'}</TableCell>
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

      <AccidentCaseEditDialog
        caseData={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default AccidentCaseTable;
