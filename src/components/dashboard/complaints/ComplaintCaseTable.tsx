import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import DashboardPaginationFooter from '@/components/dashboard/analytics/DashboardPaginationFooter';
import ComplaintCaseEditDialog from '@/components/dashboard/complaints/ComplaintCaseEditDialog';
import { useServerPagedReport } from '@/hooks/useServerPagedReport';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
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
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('supervisor');
  const { rows, total, totalPages, page, setPage, loading, refetch } = useServerPagedReport<Complaint>(
    '/api/complaints',
    {},
    PAGE_SIZE,
  );
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<Complaint | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const openEdit = (c: Complaint) => {
    setEditing(c);
    setEditOpen(true);
  };

  const handleSaved = () => {
    refetch();
    onCaseUpdated?.();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const r = await apiFetch(`/api/complaints?id=${encodeURIComponent(deleting.id)}`, { method: 'DELETE' });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(body.message || body.error || 'ลบไม่สำเร็จ');
      }
      toast.success('ลบเรื่องร้องเรียนแล้ว');
      setDeleting(null);
      refetch();
      onCaseUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ลบไม่สำเร็จ');
    } finally {
      setDeletingBusy(false);
    }
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
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
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

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบเรื่องร้องเรียนนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${deleting.driver_name} — ${formatComplaintDate(deleting.complaint_date)}` : ''}
              <br />
              การลบนี้ย้อนกลับไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction disabled={deletingBusy} onClick={() => void confirmDelete()}>
              {deletingBusy ? 'กำลังลบ…' : 'ยืนยันลบ'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ComplaintCaseTable;
