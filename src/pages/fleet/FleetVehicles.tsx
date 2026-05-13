import React, { useEffect, useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { apiFetch } from '@/lib/apiFetch';
import type { Vehicle } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

async function apiFailureMessage(r: Response): Promise<string> {
  const j = (await r.json().catch(() => ({}))) as { message?: string; error?: string; path?: string };
  const parts = [j.message, j.error].filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  let s = parts.join(' — ') || `HTTP ${r.status}`;
  if (j.path && (r.status === 404 || /not found/i.test(s))) s += ` (${j.path})`;
  return s;
}

/** รุ่น Toyota เท่านั้น — เก็บในคอลัมน์ `label` ของตาราง vehicles */
const TOYOTA_MODEL_OPTIONS = [
  'Toyota Yaris',
  'Toyota Yaris Ativ',
  'Toyota Vios',
  'Toyota Corolla Altis',
  'Toyota Corolla Cross',
  'Toyota Camry',
  'Toyota Fortuner',
  'Toyota Hilux Revo',
  'Toyota Hilux Champion',
  'Toyota Innova',
  'Toyota Innova Zenix',
  'Toyota Alphard',
  'Toyota Veloz',
  'Toyota Avanza',
  'Toyota Rush',
  'Toyota C-HR',
  'Toyota Hiace',
  'Toyota Commuter',
  'Toyota Granvia',
] as const;

const FleetVehicles: React.FC = () => {
  const [list, setList] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    void apiFetch('/api/vehicles')
      .then(async (r) => {
        if (!r.ok) throw new Error('โหลดไม่สำเร็จ');
        return r.json() as Promise<Vehicle[]>;
      })
      .then(setList)
      .catch(() => toast.error('โหลดรายการรถไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim()) {
      toast.error('กรอกทะเบียนรถ');
      return;
    }
    if (!model.trim()) {
      toast.error('เลือกรุ่นรถ Toyota');
      return;
    }
    setSaving(true);
    try {
      const r = await apiFetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate_no: plate.trim(),
          label: model.trim(),
          seats: 5,
        }),
      });
      if (!r.ok) {
        const apiText = await apiFailureMessage(r);
        let msg = apiText;
        if (r.status === 401) {
          msg =
            'ยังไม่ได้เข้าสู่ระบบหรือ session หมดอายุ — กลับไปหน้า Login แล้วล็อกอินใหม่ (หลัง db:seed ใช้ admin@example.com และรหัสจาก SEED_USER_PASSWORD หรือ ChangeMe123!)';
          if (apiText && !/Unauthorized|Missing auth/i.test(apiText)) msg = apiText;
        }
        if (r.status === 403) {
          msg =
            apiText && !apiText.includes('Forbidden')
              ? apiText
              : 'ไม่มีสิทธิ์บันทึก — ลองเข้าด้วยบัญชี supervisor หรือ admin';
        }
        if (r.status === 409) {
          msg = apiText.includes('ทะเบียน') ? apiText : apiText || 'ทะเบียนรถซ้ำในระบบ';
        }
        if (r.status >= 500 && /relation|does not exist|ไม่มีตาราง/i.test(apiText)) {
          msg =
            'ฐานข้อมูลยังไม่มีตารางรถใน schema car_stamp — รัน npm run db:inspect แล้ว npm run db:migrate (ถ้า inspect บอกว่า car_stamp ว่างแต่มีประวัติ migration ให้รัน npm run db:migrate:replay แล้ว npm run db:seed)';
        }
        throw new Error(msg);
      }
      toast.success('เพิ่มรถแล้ว');
      setPlate('');
      setModel('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="รายการรถ" subtitle="ทะเบียนรถ — เลือกรุ่น Toyota จากรายการ" backPath="/fleet" />
      <div className="px-4 md:px-6 py-4 space-y-6 max-w-2xl">
        <form onSubmit={submit} className="glass-card rounded-xl p-4 border border-border space-y-3">
          <p className="text-sm font-medium text-foreground">เพิ่มรถ</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plate">ทะเบียนรถ</Label>
              <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="กข 1234" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">รุ่นรถ (Toyota)</Label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                required
              >
                <option value="">— เลือกรุ่น —</option>
                {TOYOTA_MODEL_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
        </form>

        <div className="glass-card rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-2 gap-0 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div className="px-4 py-2">ทะเบียนรถ</div>
            <div className="px-4 py-2">รุ่นรถ</div>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">กำลังโหลด…</div>
          ) : list.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">ยังไม่มีรถ — เพิ่มจากฟอร์มด้านบน</div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((v) => (
                <li key={v.id} className="grid grid-cols-2 gap-0 text-sm">
                  <div className="px-4 py-3 font-mono font-medium text-foreground">{v.plate_no}</div>
                  <div className="px-4 py-3 text-foreground">{v.label?.trim() ? v.label : '—'}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FleetVehicles;
