import React, { useMemo } from 'react';
import { getDaysInMonth } from 'date-fns';
import { cn } from '@/lib/utils';

const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const t = (ymd ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [ys, ms, ds] = t.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function toYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

type Props = {
  value: string;
  onChange: (ymd: string) => void;
  minYmd?: string;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
  'aria-label'?: string;
};

/**
 * เลือกวันที่แบบ วัน / เดือน / ปี (ค่าภายใน yyyy-MM-dd)
 */
export const DateDmySelect: React.FC<Props> = ({
  value,
  onChange,
  minYmd,
  disabled,
  className = 'flex flex-wrap gap-1.5 items-end',
  selectClassName = 'h-8 rounded-md border border-input bg-background px-1.5 text-xs text-foreground min-w-[3.25rem]',
  'aria-label': ariaLabel,
}) => {
  const now = new Date();
  const yearOptions = useMemo(() => {
    const cur = now.getFullYear();
    const out: number[] = [];
    for (let y = cur - 2; y <= cur + 2; y += 1) out.push(y);
    return out;
  }, [now.getFullYear()]);

  const parsed = parseYmd(value) ?? {
    y: now.getFullYear(),
    m: now.getMonth() + 1,
    d: now.getDate(),
  };

  const minParsed = minYmd ? parseYmd(minYmd) : null;

  const maxDay = getDaysInMonth(new Date(parsed.y, parsed.m - 1, 1));
  const day = Math.min(parsed.d, maxDay);

  const commit = (y: number, m: number, d: number) => {
    const maxD = getDaysInMonth(new Date(y, m - 1, 1));
    let dd = Math.min(Math.max(1, d), maxD);
    let mm = m;
    let yy = y;
    let next = toYmd(yy, mm, dd);
    if (minParsed) {
      const minStr = toYmd(minParsed.y, minParsed.m, minParsed.d);
      if (next < minStr) {
        next = minStr;
        const p = parseYmd(next)!;
        yy = p.y;
        mm = p.m;
        dd = p.d;
      }
    }
    onChange(next);
  };

  const dayOptions = useMemo(() => {
    const out: number[] = [];
    for (let i = 1; i <= maxDay; i += 1) {
      if (minParsed && parsed.y === minParsed.y && parsed.m === minParsed.m && i < minParsed.d) continue;
      out.push(i);
    }
    return out.length ? out : [1];
  }, [maxDay, minParsed, parsed.y, parsed.m]);

  const monthOptions = useMemo(() => {
    const out: number[] = [];
    for (let m = 1; m <= 12; m += 1) {
      if (minParsed && parsed.y === minParsed.y && m < minParsed.m) continue;
      out.push(m);
    }
    return out;
  }, [minParsed, parsed.y]);

  const yearOptionsFiltered = useMemo(() => {
    if (!minParsed) return yearOptions;
    return yearOptions.filter((y) => y >= minParsed.y);
  }, [yearOptions, minParsed]);

  return (
    <div className={cn(className)} role="group" aria-label={ariaLabel ?? 'วันที่'}>
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] text-muted-foreground">วัน</span>
        <select
          disabled={disabled}
          className={selectClassName}
          value={day}
          onChange={(e) => commit(parsed.y, parsed.m, Number(e.target.value))}
        >
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] text-muted-foreground">เดือน</span>
        <select
          disabled={disabled}
          className={cn(selectClassName, 'min-w-[4.5rem]')}
          value={parsed.m}
          onChange={(e) => commit(parsed.y, Number(e.target.value), day)}
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {THAI_MONTHS[m - 1]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] text-muted-foreground">ปี</span>
        <select
          disabled={disabled}
          className={cn(selectClassName, 'min-w-[4.75rem]')}
          value={parsed.y}
          onChange={(e) => commit(Number(e.target.value), parsed.m, day)}
        >
          {yearOptionsFiltered.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
