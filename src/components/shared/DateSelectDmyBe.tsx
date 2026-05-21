import React, { useMemo, useState } from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { th } from 'date-fns/locale';
import { parseYmd, toYmdLocal, formatYmdDmyBe, formatYmdDmyCe } from '@/lib/dateTh';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export interface DateSelectDmyBeProps {
  /** YYYY-MM-DD หรือ '' ถ้า allowEmpty */
  value: string;
  onChange: (isoYmd: string) => void;
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
  /** ปุ่มแสดงวันที่ — ค่าเริ่ม h-10 */
  triggerClassName?: string;
  /** แสดงปี ค.ศ. (20/05/2026) หรือ พ.ศ. (20/05/2569) */
  yearKind?: 'ce' | 'be';
  /** ห้ามเลือกก่อนวันนี้ (YYYY-MM-DD) */
  minYmd?: string;
  'aria-label'?: string;
}

/** เลือกวันที่จากปฏิทิน — แสดงปุ่มเป็น วัน/เดือน/ปี; ค่าที่ส่งออกเป็น YYYY-MM-DD */
const DateSelectDmyBe: React.FC<DateSelectDmyBeProps> = ({
  value,
  onChange,
  allowEmpty = false,
  disabled = false,
  className = '',
  triggerClassName,
  yearKind = 'be',
  minYmd,
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => {
    const parsed = parseYmd(value);
    if (!parsed) return undefined;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }, [value]);

  const minDate = useMemo(() => {
    const parsed = parseYmd(minYmd);
    if (!parsed) return undefined;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }, [minYmd]);

  const displayLabel = useMemo(() => {
    if (!value) return allowEmpty ? 'เลือกวันที่' : '';
    return yearKind === 'ce' ? formatYmdDmyCe(value) : formatYmdDmyBe(value);
  }, [allowEmpty, value, yearKind]);

  const defaultTriggerClass =
    'w-full h-10 bg-secondary border border-border rounded-lg px-3 text-sm text-foreground flex items-center justify-between gap-2 disabled:opacity-50';

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(defaultTriggerClass, triggerClassName)}
            aria-label={ariaLabel ?? displayLabel ?? 'เลือกวันที่'}
          >
            <span className={cn('truncate', !displayLabel && 'text-muted-foreground')}>
              {displayLabel || 'เลือกวันที่'}
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={th}
            selected={selectedDate}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={(date) => {
              if (!date) {
                if (allowEmpty) onChange('');
                return;
              }
              onChange(toYmdLocal(date));
              setOpen(false);
            }}
            initialFocus
          />
          {allowEmpty ? (
            <div className="border-t border-border p-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-secondary hover:bg-secondary/80"
              >
                <X className="h-3.5 w-3.5" />
                ล้างวันที่
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateSelectDmyBe;
