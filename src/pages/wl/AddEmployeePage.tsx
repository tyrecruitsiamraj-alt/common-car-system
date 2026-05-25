import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
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
import { toast } from 'sonner';
import { createEmployeeSimple } from '@/lib/createEmployeeSimple';
import { TITLE_PREFIX_OPTIONS } from '@/lib/titlePrefixOptions';

const TITLE_PREFIX_NONE = '__none__';

const AddEmployeePage: React.FC = () => {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [titlePrefix, setTitlePrefix] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      await createEmployeeSimple({
        title_prefix: titlePrefix,
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      toast.success('เพิ่มรายชื่อแล้ว');
      navigate('/fleet/drivers');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Add Driver" subtitle="คำนำหน้า ชื่อ นามสกุล และเบอร์โทร" backPath="/fleet/drivers" />
      <div className="px-4 md:px-6">
        <form
          onSubmit={(e) => void handleSave(e)}
          className="glass-card rounded-xl p-4 md:p-6 border border-border max-w-lg space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[7.5rem_1fr_1fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-prefix">คำนำหน้า</Label>
              <Select
                value={titlePrefix || TITLE_PREFIX_NONE}
                onValueChange={(v) => setTitlePrefix(v === TITLE_PREFIX_NONE ? '' : v)}
              >
                <SelectTrigger id="add-prefix" className="min-h-[44px]">
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
              <Label htmlFor="add-first">ชื่อ *</Label>
              <Input
                id="add-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className="min-h-[44px]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-last">นามสกุล *</Label>
              <Input
                id="add-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className="min-h-[44px]"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-phone">เบอร์โทร *</Label>
            <Input
              id="add-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="0812345678"
              className="min-h-[44px]"
              required
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            ระบบจะสร้างรหัสพนักงานและตำแหน่งเริ่มต้นให้อัตโนมัติ
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/fleet/drivers')} disabled={saving}>
              ยกเลิก
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddEmployeePage;
