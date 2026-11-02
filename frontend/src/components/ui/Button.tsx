'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

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
      'bg-accent hover:bg-accent-hover text-canvas font-medium border border-accent shadow-card active:scale-[0.98]',
    secondary:
      'bg-elevated hover:bg-hover text-tp border border-border active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-hover text-tp border border-border hover:border-tm active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-hover text-ts hover:text-tp',
    danger:
      'bg-danger hover:bg-destructive-hover text-canvas font-medium border border-danger shadow-card active:scale-[0.98]',
  };

  const sizeMap = {
    xs: 'px-2 py-0.5 text-[11px] rounded-button gap-1 min-h-[26px]',
    sm: 'px-2.5 py-1.5 text-xs rounded-button gap-1.5 min-h-control-sm',
    md: 'px-3.5 py-2 text-xs rounded-button gap-2 min-h-control',
    lg: 'px-5 py-2.5 text-sm rounded-button gap-2.5 min-h-[44px]',
    icon: 'p-2 rounded-button min-w-[36px] min-h-[36px] flex items-center justify-center',
  };

  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantMap[variant],
        sizeMap[size],
        className
      )}
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
