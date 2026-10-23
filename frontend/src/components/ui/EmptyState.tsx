'use client';

import React from 'react';

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
      className={`p-10 sm:p-14 text-center rounded-2xl bg-white border border-dashed border-[#CBD5E1] shadow-card space-y-4 max-w-xl mx-auto my-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#EFF5F9] border border-[#669BBC]/30 text-[#003049] flex items-center justify-center mx-auto shadow-sm">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm sm:text-base font-semibold text-[#17212B] tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-[#526174] max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
}
