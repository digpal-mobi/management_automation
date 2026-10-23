'use client';

import React, { forwardRef } from 'react';

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
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#17212B]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`w-full rounded-xl bg-white border text-xs text-[#17212B] placeholder-[#94A3B8] transition-all duration-150
            p-3.5 leading-relaxed custom-scrollbar
            focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049]
            disabled:opacity-50 disabled:bg-[#F1F4F7] disabled:cursor-not-allowed
            ${error ? 'border-[#C1121F] focus-visible:ring-[#C1121F] focus:border-[#C1121F]' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}
            ${className}`}
          {...props}
        />
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

Textarea.displayName = 'Textarea';
