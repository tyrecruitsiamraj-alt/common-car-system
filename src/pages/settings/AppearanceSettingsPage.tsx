import React, { useCallback, useRef, useState } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_BRANDING,
  hexToHslComponents,
  hslComponentsToHex,
  type BrandingConfig,
} from '@/lib/brandingStorage';
import { toast } from 'sonner';

const MAX_LOGO_FILE_BYTES = 450_000;

function ColorRow({
  label,
  hint,
  valueHex,
  onChangeHex,
}: {
  label: string;
  hint?: string;
  valueHex: string;
  onChangeHex: (hex: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={valueHex}
          onChange={(e) => onChangeHex(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-0.5 shrink-0"
          aria-label={label}
        />
        <Input
          value={valueHex}
          onChange={(e) => onChangeHex(e.target.value)}
          className="h-9 max-w-[8.5rem] font-mono text-xs"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

const AppearanceSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { config, updateConfig, resetToDefaults, syncBrandingToOrg } = useBranding();
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setPartial = useCallback((partial: Partial<BrandingConfig>) => updateConfig(partial), [updateConfig]);

  const onLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('เลือกไฟล์รูปภาพเท่านั้น');
      return;
    }
    if (f.size > MAX_LOGO_FILE_BYTES) {
      toast.error(`ไฟล์ใหญ่เกินไป (สูงสุดประมาณ ${Math.round(MAX_LOGO_FILE_BYTES / 1024)} KB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      if (!url.startsWith('data:image/')) {
        toast.error('อ่านไฟล์ไม่สำเร็จ');
        return;
      }
      setPartial({ logoDataUrl: url });
      toast.success('อัปเดตโลโก้แล้ว');
    };
    reader.onerror = () => toast.error('อ่านไฟล์ไม่สำเร็จ');
    reader.readAsDataURL(f);
  };

  const publish = async () => {
    setSyncing(true);
    try {
      const res = await syncBrandingToOrg();
      if (res.ok) toast.success(res.message ?? 'เผยแพร่แล้ว');
      else toast.error(res.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="ตั้งค่าหน้าตา"
        subtitle="ชื่อระบบ โลโก้ และสีธีม (บันทึกในเบราว์เซอร์ของคุณ)"
        backPath="/fleet"
      />

      <div className="px-4 md:px-6 pb-8 space-y-6 max-w-2xl">
        <div className="glass-card rounded-xl p-4 md:p-6 border border-border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">ชื่อระบบ</h2>
          <div className="space-y-1.5">
            <Label htmlFor="app-name" className="text-xs">
              ชื่อที่แสดงในแอป
            </Label>
            <Input
              id="app-name"
              value={config.appName}
              onChange={(e) => setPartial({ appName: e.target.value.slice(0, 200) })}
              placeholder={DEFAULT_BRANDING.appName}
              className="max-w-md"
            />
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 md:p-6 border border-border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">โลโก้</h2>
          <div className="flex flex-wrap items-start gap-4">
            <div className="rounded-xl border border-border bg-card p-2 shrink-0">
              <img
                src={config.logoDataUrl || DEFAULT_BRANDING.logoDataUrl || ''}
                alt=""
                className="h-16 w-16 object-contain"
              />
            </div>
            <div className="space-y-2 min-w-0 flex-1">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoFile} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  เลือกรูป
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPartial({ logoDataUrl: DEFAULT_BRANDING.logoDataUrl });
                    toast.message('ใช้โลโก้เริ่มต้น');
                  }}
                >
                  คืนโลโก้เริ่มต้น
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                รองรับ PNG / JPG / WebP / SVG — แนะนำไม่เกิน ~{Math.round(MAX_LOGO_FILE_BYTES / 1024)} KB
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 md:p-6 border border-border space-y-5">
          <h2 className="text-sm font-semibold text-foreground">สีธีม</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorRow
              label="สีหลัก (ปุ่ม ลิงก์ ไฮไลต์)"
              valueHex={hslComponentsToHex(config.primaryHsl)}
              onChangeHex={(hex) => setPartial({ primaryHsl: hexToHslComponents(hex) })}
            />
            <ColorRow
              label="พื้นหลังหลัก"
              valueHex={hslComponentsToHex(config.backgroundHsl)}
              onChangeHex={(hex) => setPartial({ backgroundHsl: hexToHslComponents(hex) })}
            />
            <ColorRow
              label="สีตัวอักษร"
              valueHex={hslComponentsToHex(config.foregroundHsl)}
              onChangeHex={(hex) => setPartial({ foregroundHsl: hexToHslComponents(hex) })}
            />
            <ColorRow
              label="พื้นการ์ด"
              valueHex={hslComponentsToHex(config.cardHsl)}
              onChangeHex={(hex) => setPartial({ cardHsl: hexToHslComponents(hex) })}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs">พื้นหลังหน้าจอ</Label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="page-bg"
                  checked={config.pageBackgroundMode === 'solid'}
                  onChange={() => setPartial({ pageBackgroundMode: 'solid' })}
                  className="rounded-full border-border"
                />
                สีเดียว
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="page-bg"
                  checked={config.pageBackgroundMode === 'gradient'}
                  onChange={() => setPartial({ pageBackgroundMode: 'gradient' })}
                  className="rounded-full border-border"
                />
                ไล่สี
              </label>
            </div>
            {config.pageBackgroundMode === 'gradient' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <ColorRow
                  label="ไล่สี — จุดเริ่ม"
                  valueHex={hslComponentsToHex(config.gradientFromHsl)}
                  onChangeHex={(hex) => setPartial({ gradientFromHsl: hexToHslComponents(hex) })}
                />
                <ColorRow
                  label="ไล่สี — จุดสิ้นสุด"
                  valueHex={hslComponentsToHex(config.gradientToHsl)}
                  onChangeHex={(hex) => setPartial({ gradientToHsl: hexToHslComponents(hex) })}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetToDefaults();
              toast.message('รีเซ็ตเป็นค่าเริ่มต้นแล้ว');
            }}
          >
            รีเซ็ตทั้งหมด
          </Button>
          {user?.role === 'admin' ? (
            <Button type="button" disabled={syncing} onClick={() => void publish()}>
              {syncing ? 'กำลังเผยแพร่…' : 'เผยแพร่ให้ทุกคนในองค์กร'}
            </Button>
          ) : null}
        </div>
        {user?.role === 'admin' ? (
          <p className="text-[10px] text-muted-foreground max-w-xl">
            เฉพาะ Admin: ปุ่มเผยแพร่จะบันทึกธีมลงฐานข้อมูล — ผู้ใช้คนอื่นจะได้ธีมนี้หลังรีเฟรช (ถ้าเชื่อม API อยู่)
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground max-w-xl">
            การตั้งค่าถูกเก็บในเครื่องของคุณ — ถ้าต้องการให้ทั้งองค์กรใช้ธีมเดียวกัน ให้ Admin เผยแพร่จากหน้านี้
          </p>
        )}
      </div>
    </div>
  );
};

export default AppearanceSettingsPage;
