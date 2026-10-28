import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  OTHER_MODEL_VALUE,
  OTHER_TRIM_VALUE,
  TOYOTA_MODEL_OPTIONS,
  TOYOTA_MODEL_TRIMS,
  buildVehicleModelLabel,
  parseVehicleModelLabel,
} from '@/lib/toyotaModelOptions';

type Props = {
  idPrefix: string;
  /** label เต็มปัจจุบัน (เช่น "Toyota Hiace Standard") — ใช้ parse ตอนเริ่มต้นเท่านั้น ใส่ `key` ที่ parent เพื่อรีเซ็ต/เปลี่ยนคันรถ */
  initialValue?: string;
  onChange: (label: string) => void;
};

const selectClassName =
  'w-full h-10 rounded-md border border-border bg-background px-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed';

export default function ToyotaModelPicker({ idPrefix, initialValue = '', onChange }: Props) {
  const parsed = useMemo(() => parseVehicleModelLabel(initialValue), [initialValue]);
  const [mainModel, setMainModel] = useState(parsed.mainModel);
  const [customModel, setCustomModel] = useState(parsed.customModel);
  const [trim, setTrim] = useState(parsed.trim);
  const [customTrim, setCustomTrim] = useState(parsed.customTrim);

  useEffect(() => {
    onChange(buildVehicleModelLabel({ mainModel, customModel, trim, customTrim }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainModel, customModel, trim, customTrim]);

  const hasKnownModel = Boolean(mainModel) && mainModel !== OTHER_MODEL_VALUE;
  const trimOptions = hasKnownModel ? TOYOTA_MODEL_TRIMS[mainModel] ?? [] : [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-model`}>รุ่นรถ (Toyota)</Label>
          <select
            id={`${idPrefix}-model`}
            value={mainModel}
            onChange={(e) => {
              setMainModel(e.target.value);
              setTrim('');
              setCustomTrim('');
            }}
            className={selectClassName}
            required
          >
            <option value="">— เลือกรุ่น —</option>
            {TOYOTA_MODEL_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={OTHER_MODEL_VALUE}>อื่นๆ (พิมพ์เอง)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-trim`}>Model (รุ่นย่อย/เกรด)</Label>
          <select
            id={`${idPrefix}-trim`}
            value={trim}
            onChange={(e) => setTrim(e.target.value)}
            className={selectClassName}
            disabled={!hasKnownModel}
          >
            <option value="">{hasKnownModel ? '— ไม่ระบุ —' : '— เลือกรุ่นรถก่อน —'}</option>
            {trimOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {hasKnownModel ? <option value={OTHER_TRIM_VALUE}>อื่นๆ (พิมพ์เอง)</option> : null}
          </select>
        </div>
      </div>

      {mainModel === OTHER_MODEL_VALUE ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-model-custom`}>ระบุรุ่นรถ</Label>
          <Input
            id={`${idPrefix}-model-custom`}
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="เช่น Isuzu D-Max"
            required
          />
        </div>
      ) : null}

      {trim === OTHER_TRIM_VALUE ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-trim-custom`}>ระบุ Model (รุ่นย่อย/เกรด)</Label>
          <Input
            id={`${idPrefix}-trim-custom`}
            value={customTrim}
            onChange={(e) => setCustomTrim(e.target.value)}
            placeholder="ระบุรุ่นย่อย/เกรด"
          />
        </div>
      ) : null}
    </div>
  );
}
