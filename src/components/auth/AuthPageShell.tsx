import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBranding } from '@/contexts/BrandingContext';
import { getAppShellBackgroundStyle } from '@/lib/brandingStorage';
import { BrandMark, BrandTitle } from '@/components/shared/BrandMark';
import { cn } from '@/lib/utils';

type AuthPageShellProps = {
  children: React.ReactNode;
  /** ลิงก์ใต้การ์ด (เช่น กลับไปล็อกอิน / สมัครสมาชิก) */
  footer?: React.ReactNode;
};

const AuthPageShell: React.FC<AuthPageShellProps> = ({ children, footer }) => {
  const { config } = useBranding();
  const shellBg = getAppShellBackgroundStyle(config);

  return (
    <div
      className={cn(
        'min-h-[100dvh] min-h-screen flex items-center justify-center p-4 sm:p-6',
        config.pageBackgroundMode === 'solid' && 'bg-background',
      )}
      style={shellBg}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex flex-col items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandMark size="lg" />
            <h1 className="text-2xl font-bold text-foreground">
              <BrandTitle />
            </h1>
          </Link>
          <p className="text-sm text-muted-foreground mt-1">ฟลีต · Dashboard</p>
        </div>

        {children}

        {footer ? (
          <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">{footer}</div>
        ) : null}
      </motion.div>
    </div>
  );
};

export default AuthPageShell;
