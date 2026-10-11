import React from 'react';
import { Priority } from '@/types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'success' | 'warning' | 'destructive' | 'priority' | 'label';
  priority?: Priority;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'default',
  priority,
  className = '',
  size = 'md',
}: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  if (variant === 'priority' || priority) {
    const prio = priority || (children as Priority);
    let prioClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (prio === 'HIGH') {
      prioClasses = 'bg-red-500/10 text-red-400 border-red-500/30';
    } else if (prio === 'MEDIUM') {
      prioClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }

    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full border ${sizeClasses} ${prioClasses} ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            prio === 'HIGH'
              ? 'bg-red-500'
              : prio === 'MEDIUM'
              ? 'bg-amber-500'
              : 'bg-blue-500'
          }`}
        />
        {prio}
      </span>
    );
  }

  const variantMap = {
    default: 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700',
    outline: 'bg-transparent text-slate-400 border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    destructive: 'bg-red-500/10 text-red-400 border-red-500/30',
    label: 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700/80',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${sizeClasses} ${
        variantMap[variant]
      } ${className}`}
    >
      {children}
    </span>
  );
}
