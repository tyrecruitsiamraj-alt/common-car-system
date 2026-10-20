import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchablePicker, { type SearchablePickerOption } from '@/components/shared/SearchablePicker';
import { apiFetch } from '@/lib/apiFetch';
import { formatEmployeeDisplayName } from '@/lib/titlePrefixOptions';
import type { IssueReportConfig } from '@/lib/issueReportConfig';

type DriverDirectoryEntry = {
  id: string;
  employee_code?: string;
  title_prefix?: string;
  first_name: string;
  last_name: string;
};

/** จำนวนวันรวมแบบนับวันเริ่มและวันสิ้นสุด (inclusive) — ว่างหรือวันที่ไม่ถูกต้องคืนค่าว่าง */
function computeDaysInclusive(
  startYmd: string | undefined,
  endYmd: string | undefined,
  subtractDays = 0,
): string {
  if (!startYmd || !endYmd) return '';
  const start = new Date(startYmd);
  const end = new Date(endYmd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (diff <= 0) return '';
  return String(Math.max(0, diff - subtractDays));
}

function fieldBlock(label: string, required: boolean | undefined, input: React.ReactNode) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium leading-snug">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {input}
    </div>
  );
}

type Props = {
  config: IssueReportConfig;
  /** ปลายทางของปุ่ม "ยกเลิก" — หน้า dashboard ภายใน หรือหน้า login สำหรับฟอร์มสาธารณะ */
  cancelHref: string;
};

const IssueReportForm: React.FC<Props> = ({ config, cancelHref }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [pickerIds, setPickerIds] = useState<Record<string, string>>({});
  const [drivers, setDrivers] = useState<DriverDirectoryEntry[]>([]);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const needsDriverDirectory = config.fields.some((f) => f.type === 'employee-picker');

  useEffect(() => {
    if (!needsDriverDirectory) return;
    let cancelled = false;
    apiFetch('/api/driver-directory')
      .then(async (r) => {
        if (cancelled || !r.ok) return;
        const data = (await r.json()) as unknown;
        if (!cancelled) setDrivers(Array.isArray(data) ? (data as DriverDirectoryEntry[]) : []);
      })
      .catch(() => {
        if (!cancelled) setDrivers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [needsDriverDirectory]);

  const driverOptions: SearchablePickerOption[] = drivers.map((d) => ({
    value: d.id,
    label: formatEmployeeDisplayName(d),
    keywords: d.employee_code,
  }));

  const setField = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = config.fields.find((f) => {
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
        data[f.key] = computeDaysInclusive(
          values[f.computeDaysFrom.startKey],
          values[f.computeDaysFrom.endKey],
          f.computeDaysFrom.subtractDays,
        );
      }
    }

    setSaving(true);
    try {
      const r = await apiFetch('/api/issue-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: config.slug,
          report_date: values[config.primaryDateField] || null,
          employee_id: values.employee_id || null,
          employee_name: values.employee_name || null,
          position: values.position || null,
          reporter_name: reporterName || null,
          reporter_phone: reporterPhone || null,
          data,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      toast.success('บันทึกข้อมูลแล้ว');
      setValues({});
      setPickerIds({});
      setReporterName('');
      setReporterPhone('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 space-y-4">
        {config.fields.map((f) => {
          let input: React.ReactNode;
          if (f.type === 'employee-picker') {
            input = (
              <SearchablePicker
                value={pickerIds[f.key] ?? ''}
                onValueChange={(id) => {
                  setPickerIds((prev) => ({ ...prev, [f.key]: id }));
                  const driver = drivers.find((d) => d.id === id);
                  setField(f.key, driver ? formatEmployeeDisplayName(driver) : '');
                  if (f.linkedCodeField) {
                    setField(f.linkedCodeField, driver?.employee_code ?? '');
                  }
                }}
                options={driverOptions}
                placeholder={f.placeholder ?? 'พิมพ์ชื่อเพื่อค้นหาพนักงาน…'}
                emptyMessage="ไม่พบพนักงานในระบบ"
                inputClassName="h-10 text-sm"
                aria-label={f.label}
              />
            );
          } else if (f.type === 'computed-days') {
            const computed = f.computeDaysFrom
              ? computeDaysInclusive(
                  values[f.computeDaysFrom.startKey],
                  values[f.computeDaysFrom.endKey],
                  f.computeDaysFrom.subtractDays,
                )
              : '';
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
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">
          ผู้แจ้ง <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fieldBlock(
            'ชื่อผู้แจ้ง',
            false,
            <Input value={reporterName} onChange={(e) => setReporterName(e.target.value)} className="h-10 text-sm" />,
          )}
          {fieldBlock(
            'เบอร์โทรผู้แจ้ง',
            false,
            <Input
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
              className="h-10 text-sm"
            />,
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving} className="rounded-2xl h-11 min-w-[160px]">
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </Button>
        <Button type="button" variant="outline" asChild className="rounded-2xl h-11">
          <Link to={cancelHref}>ยกเลิก</Link>
        </Button>
      </div>
    </form>
  );
};

export default IssueReportForm;
