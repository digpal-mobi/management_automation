'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'p-10 sm:p-14 text-center rounded-card bg-elevated border border-dashed border-border shadow-card space-y-4 max-w-xl mx-auto my-6',
        className
      )}
    >
      <div className="w-12 h-12 rounded-card bg-accent-subtle border border-accent/30 text-accent flex items-center justify-center mx-auto">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-card-title text-tp tracking-tight">{title}</h3>
        <p className="text-body-compact text-ts max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
}
