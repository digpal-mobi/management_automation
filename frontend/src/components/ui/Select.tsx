'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

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
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[#17212B]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full rounded-xl bg-white border text-xs text-[#17212B] appearance-none cursor-pointer transition-all duration-150
              py-2.5 pl-3.5 pr-9
              focus:outline-none focus-visible:ring-1 focus-visible:ring-[#003049] focus:border-[#003049]
              disabled:opacity-50 disabled:bg-[#F1F4F7] disabled:cursor-not-allowed
              ${error ? 'border-[#C1121F] focus-visible:ring-[#C1121F] focus:border-[#C1121F]' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}
              ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white text-[#17212B]">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#526174] pointer-events-none" />
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

Select.displayName = 'Select';
