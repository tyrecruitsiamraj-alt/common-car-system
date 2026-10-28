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

const selectClassName = 'w-full h-10 rounded-md border border-border bg-background px-3 text-sm';

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

  const trimOptions = mainModel && mainModel !== OTHER_MODEL_VALUE ? TOYOTA_MODEL_TRIMS[mainModel] ?? [] : [];

  return (
    <div className="space-y-3">
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
      ) : mainModel ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-trim`}>รุ่นย่อย / เกรด (ถ้ามี)</Label>
          <select
            id={`${idPrefix}-trim`}
            value={trim}
            onChange={(e) => setTrim(e.target.value)}
            className={selectClassName}
          >
            <option value="">— ไม่ระบุ —</option>
            {trimOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={OTHER_TRIM_VALUE}>อื่นๆ (พิมพ์เอง)</option>
          </select>
          {trim === OTHER_TRIM_VALUE ? (
            <Input
              value={customTrim}
              onChange={(e) => setCustomTrim(e.target.value)}
              placeholder="ระบุรุ่นย่อย/เกรด"
              className="mt-1.5"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
