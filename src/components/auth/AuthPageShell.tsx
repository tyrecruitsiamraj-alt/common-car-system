import React from 'react';
import { Link } from 'react-router-dom';
import { useBranding } from '@/contexts/BrandingContext';
import { getAppShellBackgroundStyle } from '@/lib/brandingStorage';
import { BrandMark, BrandTitle } from '@/components/shared/BrandMark';
import { cn } from '@/lib/utils';

type AuthPageShellProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'md' | '3xl';
  hideBrand?: boolean;
};

const AuthPageShell: React.FC<AuthPageShellProps> = ({ children, footer, maxWidth = 'md', hideBrand }) => {
  const { config } = useBranding();
  const shellBg = getAppShellBackgroundStyle(config);

  return (
    <div
      className={cn(
        'min-h-[100dvh] min-h-screen flex items-center justify-center p-4 sm:p-6 text-foreground bg-background',
        config.pageBackgroundMode === 'gradient' && 'app-shell-gradient',
      )}
      style={shellBg}
    >
      <div className={cn('w-full mx-auto', maxWidth === '3xl' ? 'max-w-3xl' : 'max-w-md')}>
        {!hideBrand ? (
          <div className="mb-8 text-center">
            <Link to="/login" className="inline-flex flex-col items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <BrandMark size="lg" />
              <h1 className="text-2xl font-medium tracking-tight text-foreground">
                <BrandTitle />
              </h1>
            </Link>
          </div>
        ) : null}

        {children}

        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">{footer}</div> : null}
      </div>
    </div>
  );
};

export default AuthPageShell;
