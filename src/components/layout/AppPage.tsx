import React from 'react';
import { cn } from '@/lib/utils';

type AppPageProps = {
  children: React.ReactNode;
  /** ใช้การ์ดกลมมนแบบ Fleet (page-panel) */
  panel?: boolean;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '7xl' | 'full';
};

const maxWidthClass: Record<NonNullable<AppPageProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export default function AppPage({
  children,
  panel = false,
  className,
  maxWidth = '7xl',
}: AppPageProps) {
  return (
    <div className={cn('mx-auto w-full px-0 py-3 sm:py-4 md:py-6', maxWidthClass[maxWidth], className)}>
      {panel ? <section className="page-panel p-5 md:p-8">{children}</section> : children}
    </div>
  );
}
