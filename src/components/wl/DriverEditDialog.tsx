import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateEmployee } from '@/lib/createEmployeeSimple';
import { formatEmployeeDisplayName, TITLE_PREFIX_OPTIONS } from '@/lib/titlePrefixOptions';
import type { Employee } from '@/types';
import { toast } from 'sonner';

const TITLE_PREFIX_NONE = '__none__';

type Props = {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (employee: Employee) => void;
};

export default function DriverEditDialog({ employee, open, onOpenChange, onUpdated }: Props) {
  const [titlePrefix, setTitlePrefix] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!employee) return;
    setTitlePrefix(employee.title_prefix ?? '');
    setFirstName(employee.first_name);
    setLastName(employee.last_name);
    setPhone(employee.phone);
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || saving) return;
    setSaving(true);
    try {
      const updated = await updateEmployee(employee.id, {
        title_prefix: titlePrefix,
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      toast.success('บันทึกชื่อแล้ว');
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'แก้ไขไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[1.25rem]">
        <DialogHeader>
          <DialogTitle>แก้ไขชื่อผู้ขับ</DialogTitle>
          <DialogDescription>
            {employee ? formatEmployeeDisplayName(employee) : '—'} · {employee?.employee_code}
          </DialogDescription>
        </DialogHeader>
        {employee ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-driver-prefix" className="text-xs">
                  คำนำหน้า
                </Label>
                <Select
                  value={titlePrefix || TITLE_PREFIX_NONE}
                  onValueChange={(v) => setTitlePrefix(v === TITLE_PREFIX_NONE ? '' : v)}
                >
                  <SelectTrigger id="edit-driver-prefix" className="min-h-[40px]">
                    <SelectValue placeholder="เลือก" />
                  </SelectTrigger>
                  <SelectContent>
                    {TITLE_PREFIX_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || TITLE_PREFIX_NONE} value={opt.value || TITLE_PREFIX_NONE}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-driver-first" className="text-xs">
                  ชื่อ *
                </Label>
                <Input
                  id="edit-driver-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-driver-last" className="text-xs">
                  นามสกุล *
                </Label>
                <Input
                  id="edit-driver-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-driver-phone" className="text-xs">
                เบอร์โทร *
              </Label>
              <Input
                id="edit-driver-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'กำลังบันทึก…' : 'บันทึก'}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
