import React, { useEffect, useMemo } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function minuteChoicesForStep(minuteStep: number): number[] {
  const step = Math.min(60, Math.max(1, minuteStep));
  const out: number[] = [];
  for (let m = 0; m < 60; m += step) out.push(m);
  return out;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function formatHm(h: number, m: number) {
  return `${pad2(h)}:${pad2(m)}`;
}

/** HH:mm 24h */
export function parseHmStrict(v: string): { h: number; m: number } | null {
  const t = (v ?? '').trim().slice(0, 5);
  const m = t.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return { h, m: mm };
}

function toTotal(h: number, m: number) {
  return h * 60 + m;
}

function parseMinTotal(hm?: string): number | undefined {
  if (!hm?.trim()) return undefined;
  const p = parseHmStrict(hm.trim().slice(0, 5));
  if (!p) return undefined;
  return toTotal(p.h, p.m);
}

function maxTotalForStep(step: number): number {
  return 24 * 60 - step;
}

/** ค่า HH:mm แรกที่ ≥ max(floor, hint) และนาทีตรง step */
export function normalizeHm(hint: string, minHm: string | undefined, minuteStep: number): string {
  const floor = parseMinTotal(minHm);
  const step = Math.min(60, Math.max(1, minuteStep));
  const mins = minuteChoicesForStep(step);
  const maxT = maxTotalForStep(step);
  const hintP = parseHmStrict(hint);
  const want = Math.max(floor ?? 0, hintP ? toTotal(hintP.h, hintP.m) : floor ?? 0);

  for (let tot = 0; tot <= maxT; tot += 1) {
    if (tot < want) continue;
    const mm = tot % 60;
    const hh = Math.floor(tot / 60);
    if (hh > 23) break;
    if (!mins.includes(mm)) continue;
    return formatHm(hh, mm);
  }

  for (let tot = maxT; tot >= 0; tot -= 1) {
    const mm = tot % 60;
    const hh = Math.floor(tot / 60);
    if (!mins.includes(mm)) continue;
    if (floor !== undefined && tot < floor) continue;
    return formatHm(hh, mm);
  }

  return '00:00';
}

type TimeHm24SelectProps = {
  value: string;
  onChange: (hm: string) => void;
  minuteStep?: number;
  minHm?: string;
  /** ถ้า true และยังไม่มี HH:mm ที่ถูกต้อง จะไม่ sync ค่าไป parent (ใช้กับเวลาเลิกงานที่ไม่บังคับ) */
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
  'aria-label'?: string;
};

/**
 * เลือกเวลาแบบ 24 ชม. (ไม่ใช้ native time picker ที่บางระบบแสดง AM/PM)
 */
export const TimeHm24Select: React.FC<TimeHm24SelectProps> = ({
  value,
  onChange,
  minuteStep = 10,
  minHm,
  allowEmpty = false,
  disabled,
  className = 'flex flex-wrap gap-1.5 items-center',
  selectClassName = 'h-8 rounded-md border border-input bg-background px-1.5 text-xs text-foreground min-w-[4.25rem]',
  'aria-label': ariaLabel,
}) => {
  const step = Math.min(60, Math.max(1, minuteStep));
  const minTotal = useMemo(() => parseMinTotal(minHm), [minHm]);
  const maxT = useMemo(() => maxTotalForStep(step), [step]);
  const minutes = useMemo(() => minuteChoicesForStep(step), [step]);

  const { hourOptions, validPair, minuteOptsForHour } = useMemo(() => {
    const vp = (h: number, m: number) => {
      const t = toTotal(h, m);
      if (t > maxT) return false;
      if (!minutes.includes(m)) return false;
      if (minTotal !== undefined && t < minTotal) return false;
      return true;
    };
    const mo = (h: number) => minutes.filter((m) => vp(h, m));
    const ho = HOURS.filter((h) => mo(h).length > 0);
    return { hourOptions: ho, validPair: vp, minuteOptsForHour: mo };
  }, [minutes, minTotal, maxT]);

  const hasValue = Boolean(parseHmStrict((value ?? '').trim().slice(0, 5)));
  const treatEmpty = allowEmpty && !hasValue;

  if (treatEmpty) {
    return (
      <div className={className} role="group" aria-label={ariaLabel}>
        <select
          disabled={disabled}
          className={selectClassName}
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            const h = Number(v);
            const opts = minuteOptsForHour(h);
            const m = opts[0] ?? 0;
            onChange(formatHm(h, m));
          }}
        >
          <option value="">—</option>
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {pad2(h)}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground select-none">:</span>
        <select disabled className={`${selectClassName} opacity-50`} value="">
          <option value="">—</option>
        </select>
      </div>
    );
  }

  const normalized = useMemo(() => normalizeHm(value, minHm, step), [value, minHm, step]);

  useEffect(() => {
    const v = (value ?? '').trim().slice(0, 5);
    if (v === normalized) return;
    onChange(normalized);
  }, [value, normalized, onChange]);

  const n = parseHmStrict(normalized) ?? { h: 0, m: 0 };
  let hSel = n.h;
  let mSel = n.m;
  if (!hourOptions.includes(hSel)) hSel = hourOptions[0] ?? 0;
  const mOpts = minuteOptsForHour(hSel);
  if (!mOpts.includes(mSel)) mSel = mOpts[0] ?? 0;

  const commit = (h: number, m: number) => {
    if (!validPair(h, m)) {
      onChange(normalizeHm(formatHm(h, m), minHm, step));
      return;
    }
    onChange(formatHm(h, m));
  };

  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      <select
        disabled={disabled}
        className={selectClassName}
        value={hSel}
        onChange={(e) => {
          const h = Number(e.target.value);
          const opts = minuteOptsForHour(h);
          const prevM = parseHmStrict(normalized)?.m ?? mSel;
          const m = opts.includes(prevM) ? prevM : opts[0] ?? 0;
          commit(h, m);
        }}
      >
        {hourOptions.map((h) => (
          <option key={h} value={h}>
            {pad2(h)}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground select-none">:</span>
      <select
        disabled={disabled}
        className={selectClassName}
        value={pad2(mSel)}
        onChange={(e) => {
          const m = Number(e.target.value);
          commit(hSel, m);
        }}
      >
        {mOpts.map((m) => (
          <option key={m} value={pad2(m)}>
            {pad2(m)}
          </option>
        ))}
      </select>
    </div>
  );
};
