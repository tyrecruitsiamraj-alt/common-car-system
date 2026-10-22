import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DRIVER_TMA_PROFILE_FIELD_GROUPS, DRIVER_TMA_PROFILE_FIELDS } from '@/lib/driverTmaProfileFieldDefs';

/** ค่าในฟอร์มของฟิลด์เสริมจาก Database TMA ทั้งหมด — key ตรงกับ DRIVER_TMA_PROFILE_FIELDS, ทุกค่าเป็น string (แปลงชนิดตอนส่ง API) */
export type DriverTmaProfileFieldsValue = Record<string, string>;

export const EMPTY_DRIVER_TMA_PROFILE_FIELDS: DriverTmaProfileFieldsValue = Object.fromEntries(
  DRIVER_TMA_PROFILE_FIELDS.map((f) => [f.key, '']),
);

type Props = {
  idPrefix: string;
  value: DriverTmaProfileFieldsValue;
  onChange: (next: DriverTmaProfileFieldsValue) => void;
};

export default function DriverTmaProfileFields({ idPrefix, value, onChange }: Props) {
  return (
    <div className="space-y-4">
      {DRIVER_TMA_PROFILE_FIELD_GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.fields.map((field) => {
              const id = `${idPrefix}-${field.key}`;
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={id} className="text-xs">
                    {field.label}
                  </Label>
                  <Input
                    id={id}
                    type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                    value={value[field.key] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
                    className="min-h-[40px] bg-background"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
