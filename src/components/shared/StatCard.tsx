import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
  onClick?: () => void;
}

const iconVariantStyles = {
  default: 'text-muted-foreground bg-muted',
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  destructive: 'text-destructive bg-destructive/10',
  info: 'text-info bg-info/10',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, trend, trendValue, variant = 'default', className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card p-5 transition-colors',
        onClick && 'cursor-pointer hover:bg-secondary/30 active:scale-[0.99]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-[1.75rem] font-medium tracking-tight text-foreground mt-1 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
          {trend && trendValue && (
            <p className={cn('text-xs font-medium mt-2', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground')}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl shrink-0', iconVariantStyles[variant])}>
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
