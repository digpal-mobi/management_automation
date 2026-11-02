'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

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
      className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-divider',
        className
      )}
    >
      <div className="space-y-1.5 min-w-0">
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-1.5 text-label text-ts hover:text-accent font-medium transition-colors mb-0.5"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>{backLink.label}</span>
          </Link>
        )}

        {breadcrumbs && !backLink && (
          <div className="flex items-center gap-2 text-label text-ts mb-0.5">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-tm">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-accent transition-colors truncate max-w-[150px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-tp font-medium truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && (
            <div className="text-accent flex items-center justify-center">{icon}</div>
          )}
          <h1 className="text-page-title text-tp tracking-tight">{title}</h1>
          {badge}
        </div>

        {description && (
          <p className="text-body-compact text-ts max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 self-start md:self-center flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
