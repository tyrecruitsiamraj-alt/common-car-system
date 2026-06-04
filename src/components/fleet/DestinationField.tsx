import React, { useEffect, useId, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { joinDestinations, splitDestinations } from '@/lib/bookingDestinations';
import { filterDestinationSuggestions } from '@/lib/bookingDestinationStorage';
import { cn } from '@/lib/utils';

const MAX_STOPS = 10;

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
  placeholder = 'เช่น สำนักงานใหญ่',
}: Props) {
  const listId = useId();
  const [stops, setStops] = useState<string[]>(() => splitDestinations(value));

  useEffect(() => {
    setStops(splitDestinations(value));
  }, [value]);

  const emit = (next: string[]) => {
    setStops(next);
    onChange(joinDestinations(next));
  };

  const updateStop = (index: number, text: string) => {
    const next = [...stops];
    next[index] = text;
    emit(next);
  };

  const addStop = () => {
    if (stops.length >= MAX_STOPS) return;
    emit([...stops, '']);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 1) {
      emit(['']);
      return;
    }
    emit(stops.filter((_, i) => i !== index));
  };

  const suggestionQuery = useMemo(
    () => stops.map((s) => s.trim()).filter(Boolean).at(-1) ?? '',
    [stops],
  );
  const options = useMemo(() => filterDestinationSuggestions(suggestionQuery), [suggestionQuery]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className={labelClassName ?? 'text-[10px]'}>สถานที่ที่ไป</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-[10px] shrink-0"
          onClick={addStop}
          disabled={stops.length >= MAX_STOPS}
        >
          <Plus className="h-3.5 w-3.5" />
          เพิ่มจุด
        </Button>
      </div>

      <ul className="space-y-1.5">
        {stops.map((stop, index) => (
          <li key={index} className="flex items-start gap-1.5">
            <span
              className="mt-2 w-4 shrink-0 text-center text-[10px] font-semibold tabular-nums text-muted-foreground"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <Input
                value={stop}
                onChange={(e) => updateStop(index, e.target.value)}
                list={listId}
                className={cn(className ?? 'h-8 text-xs')}
                placeholder={
                  index === 0
                    ? placeholder
                    : `จุดที่ ${index + 1}${index === stops.length - 1 ? ' (ปลายทาง)' : ''}`
                }
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              className={cn(
                'mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition',
                'hover:bg-destructive/10 hover:text-destructive',
                stops.length <= 1 && 'opacity-30 pointer-events-none',
              )}
              aria-label={`ลบจุดที่ ${index + 1}`}
              onClick={() => removeStop(index)}
              disabled={stops.length <= 1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <datalist id={listId}>
        {options.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      {stops.filter((s) => s.trim()).length > 1 ? (
        <p className="text-[10px] text-muted-foreground leading-snug">
          เส้นทาง:{' '}
          <span className="text-foreground/90">{joinDestinations(stops)}</span>
        </p>
      ) : options.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">เลือกจากสถานที่ที่เคยใช้ หรือพิมพ์ใหม่</p>
      ) : null}
    </div>
  );
}
