'use client';

import React, { forwardRef } from 'react';

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
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#17212B]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#526174] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-xl bg-white border text-xs text-[#17212B] placeholder-[#94A3B8] transition-all duration-150
              py-2.5 ${leftIcon ? 'pl-10' : 'pl-3.5'} ${rightIcon ? 'pr-10' : 'pr-3.5'}
              focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049]
              disabled:opacity-50 disabled:bg-[#F1F4F7] disabled:cursor-not-allowed
              ${error ? 'border-[#C1121F] focus-visible:ring-[#C1121F] focus:border-[#C1121F]' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}
              ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#526174] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[11px] text-[#C1121F] font-medium leading-tight">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-[11px] text-[#526174] leading-tight">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
