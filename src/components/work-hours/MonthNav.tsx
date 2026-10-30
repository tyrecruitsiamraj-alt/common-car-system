import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { monthYearLabelBe, shiftMonths, toYmdLocal } from '@/lib/dateTh';

type Props = {
  /** ymd ใดๆ ภายในเดือนที่กำลังดู */
  value: string;
  onChange: (ymd: string) => void;
  disableNext?: boolean;
};

const MonthNav: React.FC<Props> = ({ value, onChange, disableNext }) => {
  const isCurrentMonth = value.slice(0, 7) === toYmdLocal(new Date()).slice(0, 7);
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1 py-1">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange(shiftMonths(value, -1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[7rem] text-center text-xs font-semibold text-slate-900">{monthYearLabelBe(value)}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={disableNext && isCurrentMonth}
        onClick={() => onChange(shiftMonths(value, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrentMonth ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange(toYmdLocal(new Date()))}>
          เดือนนี้
        </Button>
      ) : null}
    </div>
  );
};

export default MonthNav;
