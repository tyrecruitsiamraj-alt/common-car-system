import React, { useId, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { filterDestinationSuggestions } from '@/lib/bookingDestinationStorage';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  labelClassName?: string;
  placeholder?: string;
};

export default function DestinationField({
  value,
  onChange,
  className,
  labelClassName,
  placeholder = 'เช่น สำนักงานใหญ่, ลูกค้า ABC, โรงงานระยอง',
}: Props) {
  const listId = useId();
  const options = useMemo(() => filterDestinationSuggestions(value), [value]);

  return (
    <div className="space-y-0.5">
      <Label className={labelClassName ?? 'text-[10px]'}>สถานที่ที่ไป</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={listId}
        className={className ?? 'h-8 text-xs'}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      {options.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">เลือกจากสถานที่ที่เคยใช้ หรือพิมพ์ใหม่</p>
      ) : null}
    </div>
  );
}
