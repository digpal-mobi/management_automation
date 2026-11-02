'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ label: string; value: string | number }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, helperText, id, children, options, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-label text-tp">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full rounded-button bg-elevated border text-xs text-tp appearance-none cursor-pointer transition-all duration-150',
              'h-control py-2 pl-3.5 pr-9',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent focus:border-accent',
              'disabled:opacity-50 disabled:bg-surface disabled:cursor-not-allowed',
              error
                ? 'border-danger focus-visible:ring-danger focus:border-danger'
                : 'border-border hover:border-tm',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-elevated text-tp">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-tm pointer-events-none" />
        </div>
        {error && <p className="text-caption text-danger leading-tight">{error}</p>}
        {!error && helperText && (
          <p className="text-caption text-ts leading-tight">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
