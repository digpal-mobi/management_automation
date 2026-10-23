'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backLink?: { label: string; href: string };
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  badge,
  breadcrumbs,
  backLink,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0] ${className}`}
    >
      <div className="space-y-1.5 min-w-0">
        {/* Navigation Breadcrumbs or Back Link */}
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-1.5 text-xs text-[#526174] hover:text-[#003049] font-medium transition-colors mb-0.5"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>{backLink.label}</span>
          </Link>
        )}

        {breadcrumbs && !backLink && (
          <div className="flex items-center gap-2 text-xs text-[#526174] mb-0.5">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[#CBD5E1]">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[#003049] transition-colors truncate max-w-[150px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#17212B] font-semibold truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Title and Icon */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <div className="text-[#003049] flex items-center justify-center">
              {icon}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-[#17212B] tracking-tight">
            {title}
          </h1>
          {badge}
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-[#526174] max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {actions && (
        <div className="flex items-center gap-2.5 self-start md:self-center flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
