import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/apiFetch';
import { toast } from 'sonner';
import type { Holiday, OtSettings } from '@/lib/workHoursConfig';

const RATE_FIELDS: { key: keyof OtSettings; label: string; unit: string; hint: string }[] = [
  {
    key: 'ot_rate_1_5x',
    label: 'อัตรา OT 1.5 เท่า (วันทำงานปกติ นอกเวลา 08:00–17:00)',
    unit: 'บาท/ชม.',
    hint: 'ใช้คูณกับชั่วโมงที่ทำงานก่อน 08:00 น. หรือหลัง 17:00 น. ในวันทำงานปกติ',
  },
  {
    key: 'ot_rate_3x',
    label: 'อัตรา OT 3 เท่า (วันหยุด นอกเวลา 08:00–17:00)',
    unit: 'บาท/ชม.',
    hint: 'ใช้คูณกับชั่วโมงที่ทำงานก่อน 08:00 น. หรือหลัง 17:00 น. ในวันหยุด',
  },
  {
    key: 'full_time_threshold_hours',
    label: 'เกณฑ์ชั่วโมงทำงานเต็มเวลา',
    unit: 'ชม./วัน',
    hint: 'เทียบจากชั่วโมงทำงานเฉลี่ยต่อวันที่มีงานจริง — เกินเกณฑ์นี้ = สถานะ "วิ่งงาน" ไม่เกิน = "ว่าง"',
  },
  {
    key: 'supervisor_ot_alert_hours',
    label: 'เกณฑ์แจ้งเตือน OT วันหยุดของนาย',
    unit: 'ชม./เดือน',
    hint: 'ใช้เป็นเกณฑ์อ้างอิงเวลาตรวจสอบ OT วันหยุดของนายที่สูงผิดปกติ',
  },
];

const WorkHoursSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<OtSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ holiday_date: '', name: '', holiday_type: 'official' as 'official' | 'company' });
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [seedingYear, setSeedingYear] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, holidaysRes] = await Promise.all([
        apiFetch('/api/ot-settings'),
        apiFetch('/api/holidays'),
      ]);
      if (settingsRes.status === 403 || holidaysRes.status === 403) {
        setForbidden(true);
        return;
      }
      if (settingsRes.ok) {
        const s = (await settingsRes.json()) as OtSettings;
        setSettings(s);
        setDraft({
          ot_rate_1_5x: String(s.ot_rate_1_5x),
          ot_rate_3x: String(s.ot_rate_3x),
          full_time_threshold_hours: String(s.full_time_threshold_hours),
          supervisor_ot_alert_hours: String(s.supervisor_ot_alert_hours),
        });
      }
      if (holidaysRes.ok) {
        setHolidays((await holidaysRes.json()) as Holiday[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const r = await apiFetch('/api/ot-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          ot_rate_1_5x: Number(draft.ot_rate_1_5x),
          ot_rate_3x: Number(draft.ot_rate_3x),
          full_time_threshold_hours: Number(draft.full_time_threshold_hours),
          supervisor_ot_alert_hours: Number(draft.supervisor_ot_alert_hours),
        }),
      });
      if (!r.ok) {
        toast.error('บันทึกการตั้งค่าไม่สำเร็จ');
        return;
      }
      const s = (await r.json()) as OtSettings;
      setSettings(s);
      toast.success('บันทึกการตั้งค่าแล้ว');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async () => {
    if (!newHoliday.holiday_date || !newHoliday.name.trim()) {
      toast.error('กรอกวันที่และชื่อวันหยุดให้ครบ');
      return;
    }
    setAddingHoliday(true);
    try {
      const r = await apiFetch('/api/holidays', { method: 'POST', body: JSON.stringify(newHoliday) });
      if (!r.ok) {
        toast.error('เพิ่มวันหยุดไม่สำเร็จ');
        return;
      }
      setNewHoliday({ holiday_date: '', name: '', holiday_type: 'official' });
      await load();
      toast.success('เพิ่มวันหยุดแล้ว');
    } finally {
      setAddingHoliday(false);
    }
  };

  const seedStandardYear = async () => {
    const year = new Date().getFullYear();
    setSeedingYear(true);
    try {
      const r = await apiFetch('/api/holidays', { method: 'POST', body: JSON.stringify({ seed_standard_year: year }) });
      if (!r.ok) {
        toast.error('เติมวันหยุดมาตรฐานไม่สำเร็จ');
        return;
      }
      await load();
      toast.success(`เติมวันหยุดมาตรฐานของปี ${year} แล้ว`);
    } finally {
      setSeedingYear(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    const r = await apiFetch(`/api/holidays?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) {
      toast.error('ลบวันหยุดไม่สำเร็จ');
      return;
    }
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  if (forbidden) {
    return (
      <main className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-10 text-slate-900">
        <div className="max-w-sm text-center space-y-2">
          <Lock className="h-8 w-8 mx-auto text-slate-400" />
          <p className="text-sm text-muted-foreground">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link to="/work-hours" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> สรุปชั่วโมงทำงาน
            </Link>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-950">ตั้งค่า OT และปฏิทินวันหยุด</h1>
            <p className="mt-1 text-sm text-muted-foreground">ค่าที่ตั้งไว้ที่นี่จะถูกใช้คำนวณชั่วโมงทำงานและค่า OT ทั้งระบบ</p>
          </div>
          <Badge className="border border-amber-200 bg-amber-50 text-amber-800 font-semibold gap-1.5">
            <Lock className="h-3 w-3" /> เฉพาะ Admin / Supervisor
          </Badge>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">เรท OT และเกณฑ์ชั่วโมงทำงาน</h2>
            <p className="text-xs text-muted-foreground mt-0.5">แก้ไขตัวเลขได้ตามจริง ระบบไม่ได้ fix ค่าเหล่านี้ไว้</p>
          </div>

          {loading || !settings ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {RATE_FIELDS.map((f) => (
                <div key={f.key}>
                  <Label className="text-xs font-semibold text-slate-700">{f.label}</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={draft[f.key] ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{f.unit}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{f.hint}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" onClick={() => void saveSettings()} disabled={saving || loading}>
              บันทึกการตั้งค่า
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-5 pb-3 flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">ปฏิทินวันหยุด</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                ใช้แยกวันทำงานปกติ (OT1.5×) กับวันหยุด (OT3×) ในการคำนวณชั่วโมงทำงาน
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void seedStandardYear()} disabled={seedingYear}>
              เติมวันหยุดมาตรฐานปีนี้อัตโนมัติ
            </Button>
          </div>

          <div className="px-5 pb-4 grid gap-2 sm:grid-cols-[1fr_2fr_1fr_auto] items-end">
            <div>
              <Label className="text-[11px] text-muted-foreground">วันที่</Label>
              <Input
                type="date"
                value={newHoliday.holiday_date}
                onChange={(e) => setNewHoliday((prev) => ({ ...prev, holiday_date: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">ชื่อวันหยุด</Label>
              <Input
                value={newHoliday.name}
                onChange={(e) => setNewHoliday((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="เช่น วันหยุดประจำปีบริษัท"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">ประเภท</Label>
              <select
                value={newHoliday.holiday_type}
                onChange={(e) =>
                  setNewHoliday((prev) => ({ ...prev, holiday_type: e.target.value as 'official' | 'company' }))
                }
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="official">ราชการ</option>
                <option value="company">บริษัท</option>
              </select>
            </div>
            <Button type="button" onClick={() => void addHoliday()} disabled={addingHoliday}>
              + เพิ่มวันหยุด
            </Button>
          </div>

          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-500">วันที่</th>
                  <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-500">ชื่อวันหยุด</th>
                  <th className="px-5 py-2.5 text-[11px] font-semibold text-slate-500">ประเภท</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-muted-foreground">
                      ยังไม่มีวันหยุดในระบบ
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id} className="border-b border-slate-50">
                      <td className="px-5 py-2.5 whitespace-nowrap tabular-nums">{h.holiday_date}</td>
                      <td className="px-5 py-2.5 font-medium">{h.name}</td>
                      <td className="px-5 py-2.5">
                        <Badge
                          className={
                            h.holiday_type === 'official'
                              ? 'border-transparent bg-blue-100 text-blue-700 font-medium'
                              : 'border-transparent bg-violet-100 text-violet-700 font-medium'
                          }
                        >
                          {h.holiday_type === 'official' ? 'ราชการ' : 'บริษัท'}
                        </Badge>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <button
                          type="button"
                          aria-label="ลบวันหยุดนี้"
                          onClick={() => void deleteHoliday(h.id)}
                          className="inline-flex p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default WorkHoursSettingsPage;
