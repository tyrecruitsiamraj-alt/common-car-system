import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  tone?: 'default' | 'danger';
};

const AccidentKpiCard: React.FC<Props> = ({ label, value, hint, loading, tone = 'default' }) => {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-2 text-3xl font-semibold tracking-tight tabular-nums',
          tone === 'danger' ? 'text-red-600' : 'text-slate-900',
        )}
      >
        {loading ? '…' : value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
};

export default AccidentKpiCard;
