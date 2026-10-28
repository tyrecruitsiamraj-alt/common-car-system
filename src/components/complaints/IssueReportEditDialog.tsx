import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ToyotaModelPicker from '@/components/fleet/ToyotaModelPicker';
import { fieldBlock } from '@/components/complaints/IssueReportForm';
import { apiFetch } from '@/lib/apiFetch';
import { daysInclusive } from '@/lib/issueReportStats';
import type { IssueReportRow } from '@/lib/issueReportStats';
import type { IssueReportConfig } from '@/lib/issueReportConfig';

type Props = {
  row: IssueReportRow;
  config: IssueReportConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: IssueReportRow) => void;
};

function computedDaysValue(computeDaysFrom: { startKey: string; endKey: string; subtractDays?: number }, values: Record<string, string>): string {
  const total = daysInclusive(values[computeDaysFrom.startKey], values[computeDaysFrom.endKey]);
  if (total <= 0) return '';
  return String(Math.max(0, total - (computeDaysFrom.subtractDays ?? 0)));
}

const IssueReportEditDialog: React.FC<Props> = ({ row, config, open, onOpenChange, onSaved }) => {
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...row.data }));
  const [saving, setSaving] = useState(false);

  const setField = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = config.fields.find((f) => {
      if (f.type === 'employee-picker') return false;
      if (f.required && !(values[f.key] ?? '').trim()) return true;
      if (f.otherField && values[f.key] === f.otherTrigger && !(values[f.otherField.key] ?? '').trim()) return true;
      return false;
    });
    if (missing) {
      const missingOtherLabel =
        missing.otherField && values[missing.key] === missing.otherTrigger ? missing.otherField.label : missing.label;
      toast.error(`กรุณากรอก ${missingOtherLabel}`);
      return;
    }

    const data: Record<string, string> = { ...values };
    for (const f of config.fields) {
      if (f.type === 'computed-days' && f.computeDaysFrom) {
        data[f.key] = computedDaysValue(f.computeDaysFrom, values);
      }
    }

    setSaving(true);
    try {
      const r = await apiFetch(`/api/issue-reports?id=${encodeURIComponent(row.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_date: values[config.primaryDateField] || null,
          position: values.position ?? row.position,
          data,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      const updated = (await r.json()) as IssueReportRow;
      toast.success('บันทึกการแก้ไขแล้ว');
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle>แก้ไข — {config.label}</DialogTitle>
          <DialogDescription>{row.employee_name ?? 'ไม่ระบุชื่อ'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {config.fields.map((f) => {
            if (f.type === 'employee-picker') {
              return (
                <React.Fragment key={f.key}>
                  {fieldBlock(f.label, false, <Input value={values[f.key] ?? ''} readOnly disabled className="h-10 text-sm bg-muted" />)}
                </React.Fragment>
              );
            }
            if (f.type === 'vehicle-model-picker') {
              return (
                <ToyotaModelPicker
                  key={f.key}
                  idPrefix={`edit-${row.id}-${f.key}`}
                  initialValue={values[f.key] ?? ''}
                  onChange={(label) => setField(f.key, label)}
                />
              );
            }

            let input: React.ReactNode;
            if (f.type === 'computed-days') {
              const computed = f.computeDaysFrom ? computedDaysValue(f.computeDaysFrom, values) : '';
              input = (
                <Input
                  value={computed ? `${computed} วัน` : ''}
                  readOnly
                  disabled
                  placeholder="คำนวณอัตโนมัติจากวันที่"
                  className="h-10 text-sm bg-muted"
                />
              );
            } else if (f.type === 'textarea') {
              input = (
                <Textarea
                  value={values[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="text-sm min-h-[4.5rem]"
                />
              );
            } else if (f.type === 'select') {
              input = (
                <>
                  <Select value={values[f.key] ?? ''} onValueChange={(v) => setField(f.key, v)}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder={f.placeholder ?? `เลือก${f.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {f.otherField && values[f.key] === f.otherTrigger ? (
                    <div className="mt-3">
                      {fieldBlock(
                        f.otherField.label,
                        true,
                        <Input
                          value={values[f.otherField.key] ?? ''}
                          onChange={(e) => setField(f.otherField!.key, e.target.value)}
                          placeholder={f.otherField.placeholder}
                          className="h-10 text-sm"
                        />,
                      )}
                    </div>
                  ) : null}
                </>
              );
            } else {
              input = (
                <Input
                  type={f.type === 'date' ? 'date' : 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="h-10 text-sm"
                />
              );
            }
            return <React.Fragment key={f.key}>{fieldBlock(f.label, f.required, input)}</React.Fragment>;
          })}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving} className="rounded-xl">
              {saving ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IssueReportEditDialog;
