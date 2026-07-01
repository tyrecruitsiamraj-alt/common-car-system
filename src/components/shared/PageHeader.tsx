import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  actions?: React.ReactNode;
  className?: string;
  showBrandKicker?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backPath,
  actions,
  className,
  showBrandKicker = false,
}) => {
  const navigate = useNavigate();

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-start gap-3">
        {backPath ? (
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-black/[0.06] bg-white/90 text-muted-foreground transition hover:bg-white hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div>
          {showBrandKicker ? (
            <p className="brand-kicker mb-1">
              <Sparkles className="h-4 w-4" /> Common Car System
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
};

export default PageHeader;
