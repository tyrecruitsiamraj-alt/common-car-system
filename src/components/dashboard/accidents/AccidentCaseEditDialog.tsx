import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ACCIDENT_TYPE_OPTIONS,
  CASE_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  MOVEMENT_DETAIL_OPTIONS,
  VEHICLE_MODEL_OPTIONS,
} from '@/lib/accidentCaseOptions';
import { getProvinceOptions } from '@/lib/thaiAddressCascade';
import { apiFetch } from '@/lib/apiFetch';
import type { AccidentCase } from '@/types';
import { toast } from 'sonner';

type FormState = {
  case_date: string;
  employee_name: string;
  driver_status: string;
  job_type: string;
  province: string;
  years_of_service: string;
  employee_age: string;
  time_range: string;
  work_day_type: string;
  vehicle_model: string;
  case_detail: string;
  accident_type: string;
  movement_detail: string;
  location_name: string;
  location_detail: string;
  root_cause: string;
  cause_detail: string;
  case_status: string;
  penalty: string;
  reporter_name: string;
  reporter_phone: string;
};

function toFormState(c: AccidentCase): FormState {
  return {
    case_date: c.case_date ?? '',
    employee_name: c.employee_name ?? '',
    driver_status: c.driver_status ?? '',
    job_type: c.job_type ?? '',
    province: c.province ?? '',
    years_of_service: c.years_of_service ?? '',
    employee_age: c.employee_age ?? '',
    time_range: c.time_range ?? '',
    work_day_type: c.work_day_type ?? '',
    vehicle_model: c.vehicle_model ?? '',
    case_detail: c.case_detail ?? '',
    accident_type: c.accident_type ?? '',
    movement_detail: c.movement_detail ?? '',
    location_name: c.location_name ?? '',
    location_detail: c.location_detail ?? '',
    root_cause: c.root_cause ?? '',
    cause_detail: c.cause_detail ?? '',
    case_status: c.case_status ?? '',
    penalty: c.penalty ?? '',
    reporter_name: c.reporter_name ?? '',
    reporter_phone: c.reporter_phone ?? '',
  };
}

function fieldBlock(label: string, input: React.ReactNode) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {input}
    </div>
  );
}

type Props = {
  caseData: AccidentCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const AccidentCaseEditDialog: React.FC<Props> = ({ caseData, open, onOpenChange, onSaved }) => {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const provinceOptions = getProvinceOptions();

  useEffect(() => {
    if (caseData) setForm(toFormState(caseData));
  }, [caseData]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData || !form) return;
    if (!form.case_date) {
      toast.error('กรุณาระบุวันที่เกิดเคส');
      return;
    }
    if (!form.employee_name.trim()) {
      toast.error('กรุณาระบุชื่อ-นามสกุลพนักงานขับรถ');
      return;
    }
    setSaving(true);
    try {
      const r = await apiFetch(`/api/accident-cases?id=${encodeURIComponent(caseData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      toast.success('บันทึกการแก้ไขแล้ว');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>แก้ไขเคสอุบัติเหตุ</DialogTitle>
          <DialogDescription>ปรับรายละเอียดเคส แล้วกดบันทึก</DialogDescription>
        </DialogHeader>

        {form ? (
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fieldBlock(
                'ชื่อ-นามสกุล *',
                <Input
                  value={form.employee_name}
                  onChange={(e) => set('employee_name', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'วันที่เกิดเคส *',
                <Input
                  type="date"
                  value={form.case_date}
                  onChange={(e) => set('case_date', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'สถานะพนักงานขับรถ',
                <Input
                  value={form.driver_status}
                  onChange={(e) => set('driver_status', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'ลักษณะงาน',
                <Select value={form.job_type} onValueChange={(v) => set('job_type', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกลักษณะงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPE_OPTIONS.map((j) => (
                      <SelectItem key={j} value={j}>
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {fieldBlock(
                'อายุงาน',
                <Input
                  value={form.years_of_service}
                  onChange={(e) => set('years_of_service', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'อายุพนักงาน',
                <Input
                  value={form.employee_age}
                  onChange={(e) => set('employee_age', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'ช่วงเวลาที่เกิดเหตุ',
                <Input
                  value={form.time_range}
                  onChange={(e) => set('time_range', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'จังหวัดที่เกิดเหตุ',
                <Select value={form.province} onValueChange={(v) => set('province', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกจังหวัด" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinceOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
            </div>

            {fieldBlock(
              'วันทำงาน',
              <RadioGroup
                value={form.work_day_type}
                onValueChange={(v) => set('work_day_type', v)}
                className="flex gap-4 pt-1"
              >
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="วันทำงาน" />
                  วันทำงาน
                </label>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="วันหยุด" />
                  วันหยุด
                </label>
              </RadioGroup>,
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fieldBlock(
                'สถานที่เกิดอุบัติเหตุ',
                <Input
                  value={form.location_name}
                  onChange={(e) => set('location_name', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'รายละเอียดจุดเกิดเหตุ',
                <Input
                  value={form.location_detail}
                  onChange={(e) => set('location_detail', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'รุ่นรถ',
                <Select value={form.vehicle_model} onValueChange={(v) => set('vehicle_model', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกรุ่นรถ" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_MODEL_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {fieldBlock(
                'ประเภทอุบัติเหตุ',
                <Select value={form.accident_type} onValueChange={(v) => set('accident_type', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกประเภทอุบัติเหตุ" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCIDENT_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
            </div>

            {fieldBlock(
              'รายละเอียดการเคลื่อนที่',
              <Select value={form.movement_detail} onValueChange={(v) => set('movement_detail', v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="เลือกรายละเอียดการเคลื่อนที่" />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_DETAIL_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            )}
            {fieldBlock(
              'รายละเอียดเคส',
              <Textarea
                value={form.case_detail}
                onChange={(e) => set('case_detail', e.target.value)}
                className="text-sm min-h-[4.5rem]"
              />,
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fieldBlock(
                'ต้นเหตุของการเกิดเคส',
                <Input
                  value={form.root_cause}
                  onChange={(e) => set('root_cause', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'รายละเอียดการเกิดเคส',
                <Input
                  value={form.cause_detail}
                  onChange={(e) => set('cause_detail', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/70 bg-muted/10 p-3">
              {fieldBlock(
                'สถานะเคส',
                <Select value={form.case_status} onValueChange={(v) => set('case_status', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกสถานะเคส" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {fieldBlock(
                'บทลงโทษ',
                <Input
                  value={form.penalty}
                  onChange={(e) => set('penalty', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fieldBlock(
                'ชื่อผู้แจ้ง',
                <Input
                  value={form.reporter_name}
                  onChange={(e) => set('reporter_name', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'เบอร์โทรผู้แจ้ง',
                <Input
                  value={form.reporter_phone}
                  onChange={(e) => set('reporter_phone', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก…
                  </>
                ) : (
                  'บันทึก'
                )}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default AccidentCaseEditDialog;
