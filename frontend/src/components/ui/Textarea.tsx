'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helperText, id, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-label text-tp">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            'w-full rounded-button bg-elevated border text-xs text-tp placeholder:text-tm transition-all duration-150',
            'p-3.5 leading-relaxed custom-scrollbar',
            'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent focus:border-accent',
            'disabled:opacity-50 disabled:bg-surface disabled:cursor-not-allowed',
            error
              ? 'border-danger focus-visible:ring-danger focus:border-danger'
              : 'border-border hover:border-tm',
            className
          )}
          {...props}
        />
        {error && <p className="text-caption text-danger leading-tight">{error}</p>}
        {!error && helperText && (
          <p className="text-caption text-ts leading-tight">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
