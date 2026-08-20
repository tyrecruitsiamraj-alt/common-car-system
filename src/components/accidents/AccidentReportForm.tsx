import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInYears, parseISO } from 'date-fns';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchablePicker, { type SearchablePickerOption } from '@/components/shared/SearchablePicker';
import { apiFetch } from '@/lib/apiFetch';
import { getProvinceOptions } from '@/lib/thaiAddressCascade';
import { formatEmployeeDisplayName } from '@/lib/titlePrefixOptions';
import {
  ACCIDENT_TYPE_OPTIONS,
  CASE_STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  MOVEMENT_DETAIL_OPTIONS,
  VEHICLE_MODEL_OPTIONS,
} from '@/lib/accidentCaseOptions';
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

const EMPTY_FORM: FormState = {
  case_date: '',
  employee_name: '',
  driver_status: '',
  job_type: '',
  province: '',
  years_of_service: '',
  employee_age: '',
  time_range: '',
  work_day_type: '',
  vehicle_model: '',
  case_detail: '',
  accident_type: '',
  movement_detail: '',
  location_name: '',
  location_detail: '',
  root_cause: '',
  cause_detail: '',
  case_status: '',
  penalty: '',
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

const AccidentReportForm: React.FC = () => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [drivers, setDrivers] = useState<DriverDirectoryEntry[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const provinceOptions = useMemo(() => getProvinceOptions(), []);

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
      employee_name: formatEmployeeDisplayName(driver),
      driver_status: driver.position || prev.driver_status,
      years_of_service: driver.join_date ? formatYearsOfService(driver.join_date) : prev.years_of_service,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const body: Record<string, string> = {};
      for (const [key, value] of Object.entries(form)) {
        const trimmed = value.trim();
        if (trimmed) body[key] = trimmed;
      }
      const r = await apiFetch('/api/accident-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || `HTTP ${r.status}`);
      }
      setDone(true);
      toast.success('บันทึกรายงานเหตุอุบัติเหตุแล้ว');
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
          <h2 className="text-lg font-bold text-foreground">ส่งรายงานเรียบร้อย</h2>
          <p className="text-sm text-muted-foreground mt-1">ขอบคุณสำหรับการแจ้งเหตุ — ทีมงานจะตรวจสอบข้อมูลต่อไป</p>
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
            แจ้งเคสใหม่
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
            'สถานะพนักงานขับรถ',
            false,
            <Input
              value={form.driver_status}
              onChange={(e) => set('driver_status', e.target.value)}
              placeholder="เช่น ประจำ"
              className="h-10 text-sm"
            />,
          )}
          {fieldBlock(
            'ลักษณะงาน',
            false,
            <Select value={form.job_type} onValueChange={(v) => set('job_type', v)}>
              <SelectTrigger className="h-10 text-sm">
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
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">ข้อมูลเหตุการณ์</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fieldBlock(
            'วันที่เกิดเคส',
            true,
            <Input
              type="date"
              value={form.case_date}
              onChange={(e) => set('case_date', e.target.value)}
              className="h-10 text-sm"
            />,
          )}
          {fieldBlock(
            'ช่วงเวลาที่เกิดเหตุ',
            false,
            <Input
              value={form.time_range}
              onChange={(e) => set('time_range', e.target.value)}
              placeholder="เช่น 12.00 - 17.00 น."
              className="h-10 text-sm"
            />,
          )}
        </div>
        {fieldBlock(
          'วันทำงาน',
          false,
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
        {fieldBlock(
          'จังหวัดที่เกิดเหตุ',
          false,
          <Select value={form.province} onValueChange={(v) => set('province', v)}>
            <SelectTrigger className="h-10 text-sm">
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
        {fieldBlock(
          'สถานที่เกิดอุบัติเหตุ',
          false,
          <Input
            value={form.location_name}
            onChange={(e) => set('location_name', e.target.value)}
            placeholder="เช่น ชื่อสถานที่ / อาคาร"
            className="h-10 text-sm"
          />,
        )}
        {fieldBlock(
          'รายละเอียดจุดเกิดเหตุ',
          false,
          <Input
            value={form.location_detail}
            onChange={(e) => set('location_detail', e.target.value)}
            placeholder="เช่น พื้นที่จอดรถที่พักนาย"
            className="h-10 text-sm"
          />,
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">รายละเอียดอุบัติเหตุ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fieldBlock(
            'รุ่นรถ',
            false,
            <Select value={form.vehicle_model} onValueChange={(v) => set('vehicle_model', v)}>
              <SelectTrigger className="h-10 text-sm">
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
            false,
            <Select value={form.accident_type} onValueChange={(v) => set('accident_type', v)}>
              <SelectTrigger className="h-10 text-sm">
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
          false,
          <Select value={form.movement_detail} onValueChange={(v) => set('movement_detail', v)}>
            <SelectTrigger className="h-10 text-sm">
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
          false,
          <Textarea
            value={form.case_detail}
            onChange={(e) => set('case_detail', e.target.value)}
            placeholder="อธิบายเหตุการณ์ที่เกิดขึ้น"
            className="text-sm min-h-[4.5rem]"
          />,
        )}
        {fieldBlock(
          'ต้นเหตุของการเกิดเคส',
          false,
          <Input
            value={form.root_cause}
            onChange={(e) => set('root_cause', e.target.value)}
            placeholder="เช่น การกะระยะ"
            className="h-10 text-sm"
          />,
        )}
        {fieldBlock(
          'รายละเอียดการเกิดเคส',
          false,
          <Input
            value={form.cause_detail}
            onChange={(e) => set('cause_detail', e.target.value)}
            placeholder="เช่น Skill"
            className="h-10 text-sm"
          />,
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">
          ผลการพิจารณา <span className="font-normal text-muted-foreground">(กรอกถ้าทราบ — ไม่บังคับ)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fieldBlock(
            'สถานะเคส',
            false,
            <Select value={form.case_status} onValueChange={(v) => set('case_status', v)}>
              <SelectTrigger className="h-10 text-sm">
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
            false,
            <Input
              value={form.penalty}
              onChange={(e) => set('penalty', e.target.value)}
              placeholder="เช่น หนังสือเตือน และพักงาน"
              className="h-10 text-sm"
            />,
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4">
        <h3 className="text-sm font-bold text-foreground border-b border-border/70 pb-1">
          ผู้แจ้งเหตุ <span className="font-normal text-muted-foreground">(ไม่บังคับ — ใช้ติดต่อกลับหากต้องสอบถามเพิ่ม)</span>
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
            'ส่งรายงาน'
          )}
        </Button>
        <Button type="button" variant="outline" asChild className="rounded-2xl h-11">
          <Link to="/login">ยกเลิก</Link>
        </Button>
      </div>
    </form>
  );
};

export default AccidentReportForm;
