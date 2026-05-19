import React, { useState } from 'react';
import { Pencil, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatYmdDmyBe } from '@/lib/dateTh';
import { updateEmployee } from '@/lib/createEmployeeSimple';
import type { Employee } from '@/types';
import { toast } from 'sonner';

type Props = {
  employee: Employee;
  canEdit: boolean;
  onUpdated: (employee: Employee) => void;
};

export default function EditEmployeeCard({ employee, canEdit, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editCode, setEditCode] = useState(employee.employee_code);
  const [editFirst, setEditFirst] = useState(employee.first_name);
  const [editLast, setEditLast] = useState(employee.last_name);
  const [editNick, setEditNick] = useState(employee.nickname ?? '');
  const [editPhone, setEditPhone] = useState(employee.phone);

  const displayNick = employee.nickname ? ` (${employee.nickname})` : '';

  const startEdit = () => {
    setEditCode(employee.employee_code);
    setEditFirst(employee.first_name);
    setEditLast(employee.last_name);
    setEditNick(employee.nickname ?? '');
    setEditPhone(employee.phone);
    setEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const updated = await updateEmployee(employee.id, {
        employee_code: editCode.trim(),
        first_name: editFirst.trim(),
        last_name: editLast.trim(),
        nickname: editNick.trim() || undefined,
        phone: editPhone.trim(),
      });
      onUpdated(updated);
      setEditing(false);
      toast.success('บันทึกข้อมูลผู้ขับแล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'แก้ไขไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 border border-border space-y-3">
      {editing ? (
        <form onSubmit={(e) => void saveEdit(e)} className="space-y-3">
          <p className="text-sm font-medium text-foreground">แก้ไขข้อมูลผู้ขับ</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-code" className="text-xs">
                รหัสพนักงาน
              </Label>
              <Input id="edit-code" value={editCode} onChange={(e) => setEditCode(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs">
                เบอร์โทร
              </Label>
              <Input id="edit-phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-first" className="text-xs">
                ชื่อ
              </Label>
              <Input id="edit-first" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-last" className="text-xs">
                นามสกุล
              </Label>
              <Input id="edit-last" value={editLast} onChange={(e) => setEditLast(e.target.value)} required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-nick" className="text-xs">
                ชื่อเล่น (ทางเลือก)
              </Label>
              <Input id="edit-nick" value={editNick} onChange={(e) => setEditNick(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              ยกเลิก
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-bold text-foreground">
                {employee.first_name} {employee.last_name}
                {displayNick}
              </div>
              <div className="text-sm text-muted-foreground">
                {employee.employee_code} · {employee.position} · {employee.phone}
              </div>
            </div>
            <span
              className={cn(
                'ml-auto text-xs px-2 py-0.5 rounded-full shrink-0',
                employee.status === 'active' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
              )}
            >
              {employee.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-muted-foreground">เริ่มงาน: {formatYmdDmyBe(employee.join_date)}</div>
            {canEdit ? (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={startEdit}>
                <Pencil className="w-3 h-3" />
                แก้ไขข้อมูล
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
