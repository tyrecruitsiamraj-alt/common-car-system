import React from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export default function ExportExcelButton({
  onClick,
  disabled,
  label = 'Export Excel',
  className,
  variant = 'outline',
  size = 'sm',
}: Props) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      className={cn('gap-2', className)}
    >
      <FileDown className="h-4 w-4 shrink-0" />
      {label}
    </Button>
  );
}
