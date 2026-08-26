import React from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'red' | 'orange' | 'blue' | 'green' | 'yellow';

type Props = {
  index: number;
  title: string;
  value: string;
  loading?: boolean;
  tone?: Tone;
  emphasize?: boolean;
};

const TONE_CLASSES: Record<Tone, { header: string; value: string }> = {
  neutral: { header: 'bg-slate-100 text-slate-700', value: 'bg-white text-slate-900' },
  red: { header: 'bg-red-700 text-white', value: 'bg-red-50 text-red-700' },
  orange: { header: 'bg-amber-800 text-white', value: 'bg-amber-50 text-amber-800' },
  blue: { header: 'bg-blue-950 text-white', value: 'bg-blue-50 text-blue-700' },
  green: { header: 'bg-emerald-800 text-white', value: 'bg-emerald-50 text-emerald-700' },
  yellow: { header: 'bg-yellow-600 text-white', value: 'bg-yellow-50 text-yellow-800' },
};

const TopStatCard: React.FC<Props> = ({ index, title, value, loading, tone = 'neutral', emphasize }) => {
  const classes = TONE_CLASSES[tone];
  return (
    <div className="rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
      <div className={cn('px-3 py-2 text-xs font-semibold', classes.header)}>
        {index}. {title}
      </div>
      <div className={cn('px-3 py-4 text-center', classes.value)}>
        <p className={cn('leading-snug', emphasize ? 'text-2xl font-bold tabular-nums' : 'text-sm font-semibold')}>
          {loading ? '…' : value}
        </p>
      </div>
    </div>
  );
};

export default TopStatCard;
