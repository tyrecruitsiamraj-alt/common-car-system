import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInYears, parseISO } from 'date-fns';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
import SearchablePicker, { type SearchablePickerOption } from '@/components/shared/SearchablePicker';
import { apiFetch } from '@/lib/apiFetch';
import { formatEmployeeDisplayName } from '@/lib/titlePrefixOptions';
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
import { toast } from 'sonner';

type DriverDirectoryEntry = {
  id: string;
  employee_code: string;
  title_prefix?: string;
  first_name: string;
  last_name: string;
  position?: string;
  join_date?: string;
};

function formatYearsOfService(joinDateYmd: string): string {
  const years = differenceInYears(new Date(), parseISO(joinDateYmd));
  if (years <= 0) return 'น้อยกว่า 1 ปี';
  return `${years} ปี`;
}

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

const EMPTY_FORM: FormState = {
  complaint_date: '',
  driver_name: '',
  customer_account: '',
  employee_id: '',
  years_of_service: '',
  employee_age: '',
  category: '',
  complaint_type: '',
  complaint_details: '',
  position: '',
  root_cause: '',
  penalty: '',
  occurrence_count: '',
  corrective_action: '',
  employee_status: '',
  case_type: '',
  reporter_name: '',
  reporter_phone: '',
};

function fieldBlock(label: string, required: boolean, input: React.ReactNode) {
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

const ComplaintReportForm: React.FC = () => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [drivers, setDrivers] = useState<DriverDirectoryEntry[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  useEffect(() => {
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
  }, []);

  const driverOptions = useMemo<SearchablePickerOption[]>(
    () =>
      drivers.map((d) => ({
        value: d.id,
        label: formatEmployeeDisplayName(d),
        keywords: d.employee_code,
      })),
    [drivers],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;
    setForm((prev) => ({
      ...prev,
      driver_name: formatEmployeeDisplayName(driver),
      employee_id: driver.employee_code || prev.employee_id,
      years_of_service: driver.join_date ? formatYearsOfService(driver.join_date) : prev.years_of_service,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const body: Record<string, string> = {};
      for (const [key, value] of Object.entries(form)) {
        const trimmed = value.trim();
        if (trimmed) body[key] = trimmed;
      }
      const r = await apiFetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      setDone(true);
      toast.success('บันทึกเรื่องร้องเรียนแล้ว');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
        <div>
          <h2 className="text-lg font-bold text-foreground">ส่งเรื่องร้องเรียนเรียบร้อย</h2>
          <p className="text-sm text-muted-foreground mt-1">ขอบคุณสำหรับการแจ้งเรื่อง — ทีมงานจะตรวจสอบข้อมูลต่อไป</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            className="rounded-2xl"
            onClick={() => {
              setForm(EMPTY_FORM);
              setSelectedDriverId('');
              setDone(false);
            }}
          >
            แจ้งเรื่องใหม่
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">ข้อมูลพนักงานขับรถ</h3>
        {fieldBlock(
          'ชื่อ-นามสกุล',
          true,
          <SearchablePicker
            value={selectedDriverId}
            onValueChange={selectDriver}
            options={driverOptions}
            placeholder="พิมพ์ชื่อเพื่อค้นหาพนักงาน…"
            emptyMessage="ไม่พบพนักงานในระบบ"
            inputClassName="h-10 text-sm"
            aria-label="ชื่อ-นามสกุล"
          />,
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fieldBlock(
            'ตำแหน่ง',
            false,
            <Select value={form.position} onValueChange={(v) => set('position', v)}>
              <SelectTrigger className="h-10 text-sm">
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
            false,
            <Input
              value={form.years_of_service}
              onChange={(e) => set('years_of_service', e.target.value)}
              placeholder="เช่น 4 ปี"
              className="h-10 text-sm"
            />,
          )}
          {fieldBlock(
            'อายุพนักงาน',
            false,
            <Input
              value={form.employee_age}
              onChange={(e) => set('employee_age', e.target.value)}
              placeholder="เช่น 57 ปี"
              className="h-10 text-sm"
            />,
          )}
          {fieldBlock(
            'Customer / Account',
            false,
            <Input
              value={form.customer_account}
              onChange={(e) => set('customer_account', e.target.value)}
              placeholder="เช่น TMA"
              className="h-10 text-sm"
            />,
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">ข้อมูลเรื่องร้องเรียน</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fieldBlock(
            'วันที่ร้องเรียน',
            true,
            <Input
              type="date"
              value={form.complaint_date}
              onChange={(e) => set('complaint_date', e.target.value)}
              className="h-10 text-sm"
            />,
          )}
          {fieldBlock(
            'หมวดหมู่',
            false,
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger className="h-10 text-sm">
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
          false,
          <Select value={form.complaint_type} onValueChange={(v) => set('complaint_type', v)}>
            <SelectTrigger className="h-10 text-sm">
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
          false,
          <Textarea
            value={form.complaint_details}
            onChange={(e) => set('complaint_details', e.target.value)}
            placeholder="อธิบายเหตุการณ์ที่เกิดขึ้น"
            className="text-sm min-h-[4.5rem]"
          />,
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">
          ผลการพิจารณา <span className="font-normal text-muted-foreground">(กรอกถ้าทราบ — ไม่บังคับ)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fieldBlock(
            'สาเหตุที่แท้จริง',
            false,
            <Select value={form.root_cause} onValueChange={(v) => set('root_cause', v)}>
              <SelectTrigger className="h-10 text-sm">
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
            false,
            <Select value={form.penalty} onValueChange={(v) => set('penalty', v)}>
              <SelectTrigger className="h-10 text-sm">
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
            false,
            <Select value={form.occurrence_count} onValueChange={(v) => set('occurrence_count', v)}>
              <SelectTrigger className="h-10 text-sm">
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
            false,
            <Select value={form.corrective_action} onValueChange={(v) => set('corrective_action', v)}>
              <SelectTrigger className="h-10 text-sm">
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
            false,
            <Select value={form.employee_status} onValueChange={(v) => set('employee_status', v)}>
              <SelectTrigger className="h-10 text-sm">
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
            false,
            <Select value={form.case_type} onValueChange={(v) => set('case_type', v)}>
              <SelectTrigger className="h-10 text-sm">
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
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">
          ผู้แจ้ง <span className="font-normal text-muted-foreground">(ไม่บังคับ — ใช้ติดต่อกลับหากต้องสอบถามเพิ่ม)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fieldBlock(
            'ชื่อผู้แจ้ง',
            false,
            <Input
              value={form.reporter_name}
              onChange={(e) => set('reporter_name', e.target.value)}
              className="h-10 text-sm"
            />,
          )}
          {fieldBlock(
            'เบอร์โทรผู้แจ้ง',
            false,
            <Input
              value={form.reporter_phone}
              onChange={(e) => set('reporter_phone', e.target.value)}
              className="h-10 text-sm"
            />,
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={saving} className="rounded-2xl h-11 min-w-[160px]">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังส่ง…
            </>
          ) : (
            'ส่งเรื่องร้องเรียน'
          )}
        </Button>
        <Button type="button" variant="outline" asChild className="rounded-2xl h-11">
          <Link to="/login">ยกเลิก</Link>
        </Button>
      </div>
    </form>
  );
};

export default ComplaintReportForm;
