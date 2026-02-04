'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            'flex h-10 w-full appearance-none rounded-lg border bg-background px-3 py-2 pr-10 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'cursor-pointer transition-colors',
            error
              ? 'border-error focus-visible:ring-error'
              : 'border-border focus-visible:ring-primary',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
