import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createEmployeeSimple } from '@/lib/createEmployeeSimple';

const AddEmployeePage: React.FC = () => {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      await createEmployeeSimple({
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
      <PageHeader title="เพิ่มชื่อผู้ขับ" subtitle="กรอกชื่อ นามสกุล และเบอร์โทร" backPath="/fleet/drivers" />
      <div className="px-4 md:px-6">
        <form
          onSubmit={(e) => void handleSave(e)}
          className="glass-card rounded-xl p-4 md:p-6 border border-border max-w-md space-y-4"
        >
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
