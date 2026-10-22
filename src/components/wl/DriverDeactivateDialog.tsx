import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { scheduleEmployeeChange } from '@/lib/employeeStatusChanges';
import { formatEmployeeDisplayName } from '@/lib/titlePrefixOptions';
import { toYmdLocal } from '@/lib/dateTh';
import type { Employee } from '@/types';
import { toast } from 'sonner';

type Props = {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** เรียกหลังปิดใช้งานสำเร็จ — ไปรีโหลดรายชื่อ (ย้ายไปแท็บ "ลาออก,พ้นสภาพ" ให้แล้ว) */
  onDeactivated: (employee: Employee) => void;
};

/**
 * ปิดใช้งานผู้ขับทันที — ใช้กลไกเดียวกับปุ่ม "ลาออก / พ้นสภาพ" ใน DriverEditDialog
 * (scheduleEmployeeChange) แต่ตั้ง effective_date เป็นวันนี้ จึงมีผลทันทีแทนที่จะรอวันที่เลือก
 */
export default function DriverDeactivateDialog({ employee, open, onOpenChange, onDeactivated }: Props) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setReason('');
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || saving) return;
    if (!reason.trim()) {
      toast.error('กรุณาระบุสาเหตุของการปิดใช้งาน');
      return;
    }
    setSaving(true);
    try {
      const updated = await scheduleEmployeeChange({
        employee_id: employee.id,
        change_type: 'resignation',
        effective_date: toYmdLocal(new Date()),
        note: reason.trim(),
      });
      toast.success(`ปิดใช้งาน ${formatEmployeeDisplayName(employee)} แล้ว — ย้ายไปแท็บ "ลาออก,พ้นสภาพ"`);
      onDeactivated(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ปิดใช้งานไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[1.25rem]">
        <DialogHeader>
          <DialogTitle>ปิดใช้งานผู้ขับ</DialogTitle>
          <DialogDescription>
            {employee ? formatEmployeeDisplayName(employee) : '—'} · {employee?.employee_code} — มีผลทันที
            และย้ายไปแท็บ &quot;ลาออก,พ้นสภาพ&quot;
          </DialogDescription>
        </DialogHeader>
        {employee ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="deactivate-reason" className="text-xs">
                สาเหตุของการปิดใช้งาน *
              </Label>
              <Textarea
                id="deactivate-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น ลาออก, ทำผิดกฎ, ไม่ผ่านประเมิน"
                rows={3}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving ? 'กำลังบันทึก…' : 'ยืนยันปิดใช้งาน'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
