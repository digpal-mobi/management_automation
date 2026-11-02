'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-label text-tp">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tm pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-button bg-elevated border text-xs text-tp placeholder:text-tm transition-all duration-150',
              'h-control py-2',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon ? 'pr-10' : 'pr-3.5',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-accent focus:border-accent',
              'disabled:opacity-50 disabled:bg-surface disabled:cursor-not-allowed',
              error
                ? 'border-danger focus-visible:ring-danger focus:border-danger'
                : 'border-border hover:border-tm',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-tm flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-caption text-danger leading-tight">{error}</p>}
        {!error && helperText && (
          <p className="text-caption text-ts leading-tight">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
