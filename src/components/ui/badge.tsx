'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'muted';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary-light text-foreground border-primary-border',
    success: 'bg-success-light text-green-800 border-green-200',
    warning: 'bg-warning-light text-amber-800 border-amber-200',
    error: 'bg-error-light text-red-800 border-red-200',
    muted: 'bg-background-muted text-foreground-secondary border-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
