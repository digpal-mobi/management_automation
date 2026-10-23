'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variantMap = {
    primary:
      'bg-[#003049] hover:bg-[#002437] text-white font-semibold border border-[#003049] shadow-sm active:scale-[0.98]',
    secondary:
      'bg-[#F1F4F7] hover:bg-[#E2E8F0] text-[#17212B] border border-[#E2E8F0] active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-[#F1F4F7] text-[#17212B] border border-[#E2E8F0] hover:border-[#CBD5E1] active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-[#F1F4F7] text-[#526174] hover:text-[#17212B]',
    danger:
      'bg-[#C1121F] hover:bg-[#9E0E19] text-white font-semibold border border-[#C1121F] shadow-sm active:scale-[0.98]',
  };

  const sizeMap = {
    xs: 'px-2 py-0.5 text-[11px] rounded-lg gap-1 min-h-[26px]',
    sm: 'px-2.5 py-1.5 text-xs rounded-xl gap-1.5 min-h-[32px]',
    md: 'px-3.5 py-2 text-xs rounded-xl gap-2 min-h-[38px]',
    lg: 'px-5 py-2.5 text-sm rounded-xl gap-2.5 min-h-[44px]',
    icon: 'p-2 rounded-xl min-w-[36px] min-h-[36px] flex items-center justify-center',
  };

  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003049] focus-visible:ring-offset-2 focus-visible:ring-offset-white
        disabled:opacity-50 disabled:pointer-events-none
        ${variantMap[variant]} ${sizeMap[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="animate-spin h-3.5 w-3.5 text-current" />
          <span>{children || 'Loading...'}</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
