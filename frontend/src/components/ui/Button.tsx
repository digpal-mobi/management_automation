'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

function isIconElement(element: unknown): boolean {
  if (!React.isValidElement(element)) return false;
  const type = element.type;
  if (type === 'svg') return true;
  if (typeof type === 'function' || typeof type === 'object') {
    const name = (type as { displayName?: string; name?: string }).displayName || (type as { displayName?: string; name?: string }).name || '';
    if (/icon|lucide|svg/i.test(name)) return true;
    const props = element.props as Record<string, unknown> | undefined;
    if (
      props &&
      (props.size !== undefined ||
        props.strokeWidth !== undefined ||
        (typeof props.className === 'string' && /\b(h-[0-9.]+|w-[0-9.]+)\b/.test(props.className)))
    ) {
      return true;
    }
  }
  return false;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    type,
    ...props
  },
  ref
) {
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

  const spinnerSizeMap = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-4.5 w-4.5',
    icon: 'h-4 w-4',
  };

  const spinner = (
    <Loader2
      className={cn('animate-spin shrink-0 text-current motion-reduce:animate-none', spinnerSizeMap[size])}
      aria-hidden="true"
    />
  );

  const renderContent = () => {
    if (size === 'icon') {
      if (isLoading) {
        return (
          <>
            {spinner}
            <span className="sr-only">{loadingText || 'Loading...'}</span>
          </>
        );
      }
      return children;
    }

    if (isLoading) {
      if (loadingText) {
        return (
          <>
            {spinner}
            <span>{loadingText}</span>
          </>
        );
      }

      // If leftIcon was passed, spinner replaces leftIcon cleanly
      if (leftIcon) {
        return (
          <>
            {spinner}
            {children}
          </>
        );
      }

      // If leftIcon was NOT passed, check if the first child is an icon
      const childArray = React.Children.toArray(children);
      if (childArray.length > 0 && isIconElement(childArray[0])) {
        // Replace the leading icon with the spinner
        return (
          <>
            {spinner}
            {childArray.slice(1)}
          </>
        );
      }

      return (
        <>
          {spinner}
          {children || 'Loading...'}
        </>
      );
    }

    return (
      <>
        {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
      </>
    );
  };

  return (
    <button
      ref={ref}
      type={type}
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
      {renderContent()}
    </button>
  );
});

