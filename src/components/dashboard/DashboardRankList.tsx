import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardRankItem } from '@/lib/fleetDashboardStats';

type Props = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  items: DashboardRankItem[];
  loading?: boolean;
  emptyText: string;
  valueSuffix?: string;
  showHours?: boolean;
};

const DashboardRankList: React.FC<Props> = ({
  title,
  subtitle,
  icon: Icon,
  items,
  loading,
  emptyText,
  valueSuffix = 'ครั้ง',
  showHours,
}) => {
  return (
    <div className="glass-card rounded-3xl p-4 space-y-2 min-h-[11rem]">
      <div className="flex items-start gap-2">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{subtitle}</p>
        </div>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground py-2">กำลังโหลด…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{emptyText}</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((row, i) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 text-xs rounded-md border border-border/60 bg-background/40 px-2 py-1.5"
            >
              <span className="text-muted-foreground tabular-nums shrink-0 w-5">{i + 1}.</span>
              <span className="flex-1 min-w-0 truncate font-medium text-foreground" title={row.label}>
                {row.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground text-right">
                {row.count} {valueSuffix}
                {showHours && row.hours !== undefined ? (
                  <span className="block text-[10px] text-muted-foreground/80">{row.hours} ชม.</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default DashboardRankList;
