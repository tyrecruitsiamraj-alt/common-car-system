import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { createEmployeeSimple } from '@/lib/createEmployeeSimple';
import type { Employee } from '@/types';
import { toast } from 'sonner';

type Props = {
  id?: string;
  onCreated: (employee: Employee) => void;
};

export default function QuickAddDriverForm({ id, onCreated }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const created = await createEmployeeSimple({
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      toast.success(`เพิ่ม ${created.first_name} ${created.last_name} แล้ว`);
      setFirstName('');
      setLastName('');
      setPhone('');
      onCreated(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      id={id}
      onSubmit={(e) => void handleSubmit(e)}
      className="glass-card rounded-xl border-2 border-primary/40 bg-primary/10 p-4 md:p-5 space-y-3 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Plus className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">เพิ่มชื่อผู้ขับ / ผู้ใช้รถ</p>
          <p className="text-[11px] text-muted-foreground">กรอกชื่อ นามสกุล เบอร์โทร แล้วกดบันทึก — ไม่ต้องออกจากหน้านี้</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="quick-first" className="text-xs">
            ชื่อ *
          </Label>
          <Input
            id="quick-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className="min-h-[40px] bg-background"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quick-last" className="text-xs">
            นามสกุล *
          </Label>
          <Input
            id="quick-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            className="min-h-[40px] bg-background"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quick-phone" className="text-xs">
            เบอร์โทร *
          </Label>
          <Input
            id="quick-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="0812345678"
            className="min-h-[40px] bg-background"
            required
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={saving} className="w-full sm:w-auto">
        {saving ? 'กำลังบันทึก…' : 'บันทึกรายชื่อ'}
      </Button>
    </form>
  );
}
