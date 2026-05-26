import React, { useEffect, useId, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type SearchablePickerOption = {
  value: string;
  label: string;
  /** ข้อความเพิ่มสำหรับค้นหา (เช่น รหัสพนักงาน) */
  keywords?: string;
};

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchablePickerOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  'aria-label'?: string;
};

function matchesQuery(opt: SearchablePickerOption, q: string): boolean {
  if (!q) return true;
  const hay = `${opt.label} ${opt.keywords ?? ''}`.toLowerCase();
  return hay.includes(q);
}

export default function SearchablePicker({
  value,
  onValueChange,
  options,
  placeholder = 'พิมพ์เพื่อค้นหา…',
  emptyMessage = 'ไม่พบรายการ',
  disabled,
  className,
  inputClassName,
  inputRef,
  autoFocus = false,
  'aria-label': ariaLabel,
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (focused) return;
    setQuery(selected?.label ?? '');
  }, [selected, focused]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => matchesQuery(o, q)).slice(0, 60);
  }, [options, query]);

  const showList = focused && !disabled;

  const pick = (opt: SearchablePickerOption) => {
    onValueChange(opt.value);
    setQuery(opt.label);
    setFocused(false);
  };

  return (
    <div className={cn('relative min-w-0', className)}>
      <Input
        type="search"
        ref={inputRef}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        className={cn('h-8 text-xs', inputClassName)}
        onChange={(e) => {
          setQuery(e.target.value);
          setFocused(true);
          if (value) onValueChange('');
        }}
        onFocus={() => {
          setFocused(true);
          if (selected) setQuery(selected.label);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setFocused(false);
            setQuery(selected?.label ?? '');
          }, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setFocused(false);
            setQuery(selected?.label ?? '');
          }
          if (e.key === 'Enter' && showList && filtered[0]) {
            e.preventDefault();
            pick(filtered[0]);
          }
        }}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[200] mt-1 max-h-48 w-full overflow-y-auto overscroll-contain rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-xs text-muted-foreground">{emptyMessage}</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt.value} role="option" aria-selected={opt.value === value}>
                <button
                  type="button"
                  className={cn(
                    'w-full px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground',
                    opt.value === value && 'bg-accent/80 font-medium',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt)}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
