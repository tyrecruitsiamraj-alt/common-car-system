import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createEmployeeSimple } from '@/lib/createEmployeeSimple';
import { TITLE_PREFIX_OPTIONS } from '@/lib/titlePrefixOptions';
import { DRIVER_DIRECTORY_POSITIONS } from '@/lib/driverListPositions';
import DriverTmaProfileFields, {
  EMPTY_DRIVER_TMA_PROFILE_FIELDS,
  type DriverTmaProfileFieldsValue,
} from '@/components/wl/DriverTmaProfileFields';
import { isBlankDriverTmaProfileFields, saveDriverTmaProfileFields } from '@/lib/driverTmaProfileEdit';
import type { Employee } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const TITLE_PREFIX_NONE = '__none__';

type Props = {
  id?: string;
  onCreated: (employee: Employee) => void;
  /** ตำแหน่งเริ่มต้นที่เลือกไว้ล่วงหน้าในฟอร์ม (เช่น ให้ตรงกับแท็บที่เปิดอยู่) */
  defaultPosition?: string;
};

export default function QuickAddDriverForm({ id, onCreated, defaultPosition }: Props) {
  const { hasPermission } = useAuth();
  // ข้อมูลเสริม TMA — ทุกตำแหน่งกรอก/แก้ไขได้เหมือนกัน
  const canEditTma = hasPermission('staff');
  const [open, setOpen] = useState(false);
  const [titlePrefix, setTitlePrefix] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState(defaultPosition || DRIVER_DIRECTORY_POSITIONS[0]);
  const [tmaFields, setTmaFields] = useState<DriverTmaProfileFieldsValue>(EMPTY_DRIVER_TMA_PROFILE_FIELDS);
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitlePrefix('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setPosition(defaultPosition || DRIVER_DIRECTORY_POSITIONS[0]);
    setTmaFields(EMPTY_DRIVER_TMA_PROFILE_FIELDS);
    setShowMore(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const created = await createEmployeeSimple({
        title_prefix: titlePrefix,
        first_name: firstName,
        last_name: lastName,
        phone,
        position,
      });
      if (canEditTma && !isBlankDriverTmaProfileFields(tmaFields)) {
        try {
          await saveDriverTmaProfileFields(created.id, tmaFields);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'บันทึกข้อมูลเสริมไม่สำเร็จ');
        }
      }
      toast.success(`เพิ่ม ${created.first_name} ${created.last_name} แล้ว`);
      resetForm();
      setOpen(false);
      onCreated(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full glass-card rounded-xl border-2 border-primary/40 bg-primary/10 p-4 md:p-5 flex items-center gap-2 text-left shadow-sm hover:bg-primary/15 transition-colors"
        >
          <Plus className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">เพิ่มชื่อผู้ขับ / ผู้ใช้รถ</p>
            <p className="text-[11px] text-muted-foreground">
              กรอกชื่อ นามสกุล เบอร์โทร แล้วกดบันทึก — ไม่ต้องออกจากหน้านี้
            </p>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl lg:max-w-4xl rounded-[1.25rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มชื่อผู้ขับ / ผู้ใช้รถ</DialogTitle>
          <DialogDescription>กรอกชื่อ นามสกุล เบอร์โทร แล้วกดบันทึก — ไม่ต้องออกจากหน้านี้</DialogDescription>
        </DialogHeader>
        <form id={id} onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quick-prefix" className="text-xs">
                คำนำหน้า
              </Label>
              <Select
                value={titlePrefix || TITLE_PREFIX_NONE}
                onValueChange={(v) => setTitlePrefix(v === TITLE_PREFIX_NONE ? '' : v)}
              >
                <SelectTrigger id="quick-prefix" className="min-h-[40px] bg-background">
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label htmlFor="quick-position" className="text-xs">
                ตำแหน่ง *
              </Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger id="quick-position" className="min-h-[40px] bg-background">
                  <SelectValue placeholder="เลือกตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_DIRECTORY_POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {canEditTma ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                ข้อมูลเพิ่มเติม (ไม่บังคับ) — ผู้บังคับบัญชา, ผู้ดูแล, ที่พัก, บัตร TDEM, วันเริ่มงาน
              </button>
              {showMore ? (
                <DriverTmaProfileFields idPrefix="quick-add-tma" value={tmaFields} onChange={setTmaFields} />
              ) : null}
            </div>
          ) : null}

          <Button type="submit" size="sm" disabled={saving} className="w-full sm:w-auto">
            {saving ? 'กำลังบันทึก…' : 'บันทึกรายชื่อ'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
