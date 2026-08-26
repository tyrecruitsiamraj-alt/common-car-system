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
import {
  CASE_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  COMPLAINT_TYPE_OPTIONS,
  CORRECTIVE_ACTION_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS,
  OCCURRENCE_COUNT_OPTIONS,
  PENALTY_OPTIONS,
  POSITION_OPTIONS,
  ROOT_CAUSE_OPTIONS,
} from '@/lib/complaintOptions';
import { apiFetch } from '@/lib/apiFetch';
import type { Complaint } from '@/types';
import { toast } from 'sonner';

type FormState = {
  complaint_date: string;
  driver_name: string;
  customer_account: string;
  employee_id: string;
  years_of_service: string;
  employee_age: string;
  category: string;
  complaint_type: string;
  complaint_details: string;
  position: string;
  root_cause: string;
  penalty: string;
  occurrence_count: string;
  corrective_action: string;
  employee_status: string;
  case_type: string;
  reporter_name: string;
  reporter_phone: string;
};

function toFormState(c: Complaint): FormState {
  return {
    complaint_date: c.complaint_date ?? '',
    driver_name: c.driver_name ?? '',
    customer_account: c.customer_account ?? '',
    employee_id: c.employee_id ?? '',
    years_of_service: c.years_of_service ?? '',
    employee_age: c.employee_age ?? '',
    category: c.category ?? '',
    complaint_type: c.complaint_type ?? '',
    complaint_details: c.complaint_details ?? '',
    position: c.position ?? '',
    root_cause: c.root_cause ?? '',
    penalty: c.penalty ?? '',
    occurrence_count: c.occurrence_count ?? '',
    corrective_action: c.corrective_action ?? '',
    employee_status: c.employee_status ?? '',
    case_type: c.case_type ?? '',
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
  caseData: Complaint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const ComplaintCaseEditDialog: React.FC<Props> = ({ caseData, open, onOpenChange, onSaved }) => {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caseData) setForm(toFormState(caseData));
  }, [caseData]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData || !form) return;
    if (!form.complaint_date) {
      toast.error('กรุณาระบุวันที่ร้องเรียน');
      return;
    }
    if (!form.driver_name.trim()) {
      toast.error('กรุณาระบุชื่อ-นามสกุลพนักงานขับรถ');
      return;
    }
    setSaving(true);
    try {
      const r = await apiFetch(`/api/complaints?id=${encodeURIComponent(caseData.id)}`, {
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
          <DialogTitle>แก้ไขเรื่องร้องเรียน</DialogTitle>
          <DialogDescription>ปรับรายละเอียดเรื่องร้องเรียน แล้วกดบันทึก</DialogDescription>
        </DialogHeader>

        {form ? (
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fieldBlock(
                'ชื่อ-นามสกุล *',
                <Input
                  value={form.driver_name}
                  onChange={(e) => set('driver_name', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'วันที่ร้องเรียน *',
                <Input
                  type="date"
                  value={form.complaint_date}
                  onChange={(e) => set('complaint_date', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'รหัสพนักงาน',
                <Input
                  value={form.employee_id}
                  onChange={(e) => set('employee_id', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'ตำแหน่ง',
                <Select value={form.position} onValueChange={(v) => set('position', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกตำแหน่ง" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
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
                'Customer / Account',
                <Input
                  value={form.customer_account}
                  onChange={(e) => set('customer_account', e.target.value)}
                  className="h-9 text-sm"
                />,
              )}
              {fieldBlock(
                'หมวดหมู่',
                <Select value={form.category} onValueChange={(v) => set('category', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
            </div>

            {fieldBlock(
              'ประเภท/ประเภทย่อยของการร้องเรียน',
              <Select value={form.complaint_type} onValueChange={(v) => set('complaint_type', v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="เลือกประเภทของการร้องเรียน" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            )}
            {fieldBlock(
              'รายละเอียดการร้องเรียน',
              <Textarea
                value={form.complaint_details}
                onChange={(e) => set('complaint_details', e.target.value)}
                className="text-sm min-h-[4.5rem]"
              />,
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/70 bg-muted/10 p-3">
              {fieldBlock(
                'สาเหตุที่แท้จริง',
                <Select value={form.root_cause} onValueChange={(v) => set('root_cause', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกสาเหตุที่แท้จริง" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOT_CAUSE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {fieldBlock(
                'บทลงโทษ',
                <Select value={form.penalty} onValueChange={(v) => set('penalty', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกบทลงโทษ" />
                  </SelectTrigger>
                  <SelectContent>
                    {PENALTY_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {fieldBlock(
                'จำนวนครั้ง',
                <Select value={form.occurrence_count} onValueChange={(v) => set('occurrence_count', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกจำนวนครั้ง" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCURRENCE_COUNT_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {fieldBlock(
                'การดำเนินการแก้ไข/ป้องกัน',
                <Select value={form.corrective_action} onValueChange={(v) => set('corrective_action', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกการดำเนินการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {CORRECTIVE_ACTION_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {fieldBlock(
                'สถานะพนักงาน',
                <Select value={form.employee_status} onValueChange={(v) => set('employee_status', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกสถานะพนักงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
              )}
              {fieldBlock(
                'เหตุการณ์',
                <Select value={form.case_type} onValueChange={(v) => set('case_type', v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="เลือกลักษณะเหตุการณ์" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPE_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
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

export default ComplaintCaseEditDialog;
