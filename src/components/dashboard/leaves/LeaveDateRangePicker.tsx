import React, { useState } from 'react';
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toYmdLocal } from '@/lib/dateTh';
import { formatLeaveDate, quickLeaveRange, type LeaveQuickRange } from '@/lib/leaveDashboard';

const QUICK_RANGES: { key: LeaveQuickRange; label: string }[] = [
  { key: 'today', label: 'วันนี้' },
  { key: 'last7', label: '7 วันล่าสุด' },
  { key: 'thisMonth', label: 'เดือนนี้' },
  { key: 'lastMonth', label: 'เดือนที่แล้ว' },
  { key: 'all', label: 'ทั้งหมด' },
];

const FIRST_YEAR = 2020;

/** ตัวเลือกเดือนและปีใน caption ของ DayPicker — select โปร่งใสซ้อนบนป้ายที่แสดงอยู่ */
const DROPDOWN_CLASSES = {
  caption_dropdowns: 'flex justify-center gap-2',
  caption_label: 'inline-flex items-center gap-1 text-sm font-medium',
  dropdown_month: 'relative inline-flex items-center',
  dropdown_year: 'relative inline-flex items-center',
  dropdown: 'absolute inset-0 z-10 w-full cursor-pointer opacity-0',
  vhidden: 'sr-only',
};

type Props = {
  from?: string;
  to?: string;
  onChange: (from: string | undefined, to: string | undefined) => void;
};

const LeaveDateRangePicker: React.FC<Props> = ({ from, to, onChange }) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => (from ? parseISO(from) : new Date()));

  const summary = from || to ? `${formatLeaveDate(from ?? to)} – ${formatLeaveDate(to ?? from)}` : 'ทุกวันที่';

  const applyRange = (range: { from?: string; to?: string }, closeAfter = true) => {
    onChange(range.from, range.to);
    if (range.from) setMonth(parseISO(range.from));
    if (closeAfter) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-9 w-full justify-start gap-2 bg-white text-sm font-normal">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">{summary}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 p-2 max-w-[20rem]">
          {QUICK_RANGES.map(({ key, label }) => (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => applyRange(quickLeaveRange(key))}
            >
              {label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          locale={th}
          month={month}
          onMonthChange={setMonth}
          captionLayout="dropdown-buttons"
          fromYear={FIRST_YEAR}
          toYear={new Date().getFullYear() + 1}
          selected={{ from: from ? parseISO(from) : undefined, to: to ? parseISO(to) : undefined }}
          onSelect={(range) => {
            const start = range?.from ? toYmdLocal(range.from) : undefined;
            const end = range?.to ? toYmdLocal(range.to) : start;
            onChange(start, end);
          }}
          classNames={DROPDOWN_CLASSES}
        />
        <div className="border-t border-slate-100 p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={() =>
              applyRange({ from: toYmdLocal(startOfMonth(month)), to: toYmdLocal(endOfMonth(month)) })
            }
          >
            เลือกทั้งเดือน {format(month, 'MMMM yyyy', { locale: th })}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LeaveDateRangePicker;
